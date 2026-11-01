#!/usr/bin/env python3
"""Assistant-only LoRA SFT for HAxBRO KAI's existing SmolLM2 360M model."""
from __future__ import annotations
import argparse, json, random
from pathlib import Path
from typing import Any
import torch
from peft import LoraConfig, TaskType, get_peft_model
from transformers import AutoModelForCausalLM, AutoTokenizer, Trainer, TrainingArguments, set_seed

BASE_MODEL = "HuggingFaceTB/SmolLM2-360M-Instruct"
DEFAULT_SYSTEM = ("You are KAI, a helpful conversational AI. Answer the user's actual request directly. "
"Use conversation context to understand follow-ups. Be natural, accurate, and clear. "
"Do not invent facts, claim actions you did not perform, or repeat generic canned replies. "
"If information is missing, say what is missing or ask one focused question.")

def parse_args():
    p=argparse.ArgumentParser()
    p.add_argument("--train",type=Path,default=Path("data/train.jsonl"))
    p.add_argument("--output-dir",type=Path,default=Path("outputs/kai360m-conversation-lora"))
    p.add_argument("--base-model",default=BASE_MODEL); p.add_argument("--revision",default=None)
    p.add_argument("--epochs",type=float,default=3); p.add_argument("--max-length",type=int,default=1024)
    p.add_argument("--batch-size",type=int,default=2); p.add_argument("--gradient-accumulation",type=int,default=8)
    p.add_argument("--learning-rate",type=float,default=2e-4); p.add_argument("--lora-r",type=int,default=8)
    p.add_argument("--lora-alpha",type=int,default=16); p.add_argument("--lora-dropout",type=float,default=0.05)
    p.add_argument("--max-samples",type=int,default=0,help="Optional smoke-test cap.")
    p.add_argument("--seed",type=int,default=51); p.add_argument("--resume-from-checkpoint",default=None)
    return p.parse_args()

def read_jsonl(path:Path)->list[dict[str,Any]]:
    rows=[]
    for line_no,line in enumerate(path.read_text(encoding="utf-8").splitlines(),1):
        if not line.strip(): continue
        try: row=json.loads(line)
        except json.JSONDecodeError as exc: raise ValueError(f"{path}:{line_no}: invalid JSON: {exc}") from exc
        messages=row.get("messages")
        if not isinstance(messages,list) or not messages: raise ValueError(f"{path}:{line_no}: messages must be a non-empty array")
        for msg in messages:
            if msg.get("role") not in {"system","user","assistant"} or not isinstance(msg.get("content"),str) or not msg["content"].strip():
                raise ValueError(f"{path}:{line_no}: invalid message role/content")
        if not any(m["role"]=="assistant" for m in messages): raise ValueError(f"{path}:{line_no}: no assistant target")
        rows.append(row)
    if not rows: raise ValueError(f"No examples found in {path}")
    return rows

def common_prefix_length(a,b):
    i=0
    while i<min(len(a),len(b)) and a[i]==b[i]: i+=1
    return i

def encode_example(row,tokenizer,max_length):
    messages=row["messages"]
    if messages[0]["role"]!="system": messages=[{"role":"system","content":DEFAULT_SYSTEM}]+messages
    full=tokenizer.apply_chat_template(messages,tokenize=True,add_generation_prompt=False)
    full=list(full.tolist() if hasattr(full,"tolist") else full)
    labels=[-100]*len(full)
    for i,msg in enumerate(messages):
        if msg["role"]!="assistant": continue
        prefix=tokenizer.apply_chat_template(messages[:i],tokenize=True,add_generation_prompt=True)
        partial=tokenizer.apply_chat_template(messages[:i+1],tokenize=True,add_generation_prompt=False)
        prefix=list(prefix.tolist() if hasattr(prefix,"tolist") else prefix)
        partial=list(partial.tolist() if hasattr(partial,"tolist") else partial)
        start=common_prefix_length(prefix,partial); end=min(len(partial),len(full))
        if start<end: labels[start:end]=full[start:end]
    if len(full)>max_length: full,labels=full[-max_length:],labels[-max_length:]
    if not any(x!=-100 for x in labels): raise ValueError("No assistant tokens left after masking/truncation")
    return {"input_ids":full,"attention_mask":[1]*len(full),"labels":labels}

class AssistantOnlyCollator:
    def __init__(self,pad_token_id): self.pad_token_id=pad_token_id
    def __call__(self,features):
        width=max(len(x["input_ids"]) for x in features); ids=[]; masks=[]; labels=[]
        for x in features:
            pad=width-len(x["input_ids"])
            ids.append(x["input_ids"]+[self.pad_token_id]*pad)
            masks.append(x["attention_mask"]+[0]*pad); labels.append(x["labels"]+[-100]*pad)
        return {"input_ids":torch.tensor(ids,dtype=torch.long),
                "attention_mask":torch.tensor(masks,dtype=torch.long),
                "labels":torch.tensor(labels,dtype=torch.long)}

def main():
    a=parse_args(); set_seed(a.seed); random.seed(a.seed)
    rows=read_jsonl(a.train)
    if a.max_samples: rows=rows[:a.max_samples]
    print(f"Loading {a.base_model}; examples={len(rows)}")
    tok=AutoTokenizer.from_pretrained(a.base_model,revision=a.revision)
    if tok.pad_token_id is None: tok.pad_token=tok.eos_token
    if not getattr(tok,"chat_template",None): raise RuntimeError("Base tokenizer has no chat template; refusing to guess.")
    data=[encode_example(row,tok,a.max_length) for row in rows]
    target_tokens=sum(sum(y!=-100 for y in x["labels"]) for x in data)
    print(f"Assistant-only supervised tokens: {target_tokens}")
    if torch.cuda.is_available(): device,dtype="CUDA",torch.float16
    elif getattr(torch.backends,"mps",None) and torch.backends.mps.is_available(): device,dtype="Apple MPS",torch.float32
    else: device,dtype="CPU",torch.float32
    print(f"Training device: {device}; dtype={dtype}")
    model=AutoModelForCausalLM.from_pretrained(a.base_model,revision=a.revision,torch_dtype=dtype,low_cpu_mem_usage=True)
    model.config.use_cache=False; model.gradient_checkpointing_enable()
    lora=LoraConfig(task_type=TaskType.CAUSAL_LM,r=a.lora_r,lora_alpha=a.lora_alpha,lora_dropout=a.lora_dropout,
      target_modules=["q_proj","k_proj","v_proj","o_proj","gate_proj","up_proj","down_proj"],bias="none")
    model=get_peft_model(model,lora); model.print_trainable_parameters()
    args=TrainingArguments(output_dir=str(a.output_dir),num_train_epochs=a.epochs,
      per_device_train_batch_size=a.batch_size,gradient_accumulation_steps=a.gradient_accumulation,
      learning_rate=a.learning_rate,warmup_ratio=0.05,weight_decay=0.01,logging_steps=5,
      save_strategy="epoch",save_total_limit=2,report_to="none",fp16=torch.cuda.is_available(),
      bf16=False,gradient_checkpointing=True,optim="adamw_torch",
      dataloader_pin_memory=torch.cuda.is_available(),remove_unused_columns=False,seed=a.seed,data_seed=a.seed)
    trainer=Trainer(model=model,args=args,train_dataset=data,data_collator=AssistantOnlyCollator(tok.pad_token_id))
    trainer.train(resume_from_checkpoint=a.resume_from_checkpoint)
    a.output_dir.mkdir(parents=True,exist_ok=True); trainer.save_model(str(a.output_dir)); tok.save_pretrained(a.output_dir)
    manifest={"base_model":a.base_model,"base_revision":a.revision,"method":"LoRA supervised fine-tuning",
      "target_modules":lora.target_modules,"lora_r":a.lora_r,"lora_alpha":a.lora_alpha,"lora_dropout":a.lora_dropout,
      "epochs":a.epochs,"max_length":a.max_length,"train_examples":len(data),"assistant_target_tokens":target_tokens,
      "seed":a.seed,"device":device,"warning":"Starter dataset only; evaluate before release."}
    (a.output_dir/"kai-training-manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")
    print(f"Saved adapter and manifest: {a.output_dir}")

if __name__=="__main__": main()
