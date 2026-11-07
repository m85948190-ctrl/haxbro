#!/usr/bin/env python3
"""LoRA fine-tuning for Qwen3-0.6B with instruction/output JSONL."""
import argparse, json
from pathlib import Path
import torch
from datasets import Dataset
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM, AutoTokenizer, DataCollatorForSeq2Seq, Trainer, TrainingArguments

BASE_MODEL = "Qwen/Qwen3-0.6B"
SYSTEM = "You are HAxBRO Code, a careful programming assistant. Write secure, maintainable code. Never claim code was run unless it was actually executed."

def read_rows(path):
    rows=[]
    for n,line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(),1):
        if not line.strip(): continue
        row=json.loads(line)
        if not isinstance(row,dict) or not str(row.get("instruction","")).strip() or not str(row.get("output","")).strip():
            raise ValueError(f"Line {n} needs non-empty instruction and output fields.")
        rows.append(row)
    if len(rows)<2: raise ValueError("Provide at least two examples; the sample dataset is only a format smoke test.")
    return rows

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--data",required=True)
    ap.add_argument("--output",default="training/output/qwen3-06b-haxbro-code-lora")
    ap.add_argument("--epochs",type=float,default=2)
    ap.add_argument("--max-length",type=int,default=2048)
    ap.add_argument("--learning-rate",type=float,default=2e-4)
    a=ap.parse_args()
    rows=read_rows(a.data)
    tok=AutoTokenizer.from_pretrained(BASE_MODEL)
    if tok.pad_token is None: tok.pad_token=tok.eos_token
    kwargs={}
    if torch.cuda.is_available():
        kwargs["torch_dtype"]=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
        kwargs["device_map"]="auto"
    else: kwargs["torch_dtype"]=torch.float32
    model=AutoModelForCausalLM.from_pretrained(BASE_MODEL,**kwargs)
    model.config.use_cache=False
    model.gradient_checkpointing_enable()
    model=get_peft_model(model,LoraConfig(r=16,lora_alpha=32,lora_dropout=0.05,bias="none",task_type="CAUSAL_LM",target_modules=["q_proj","k_proj","v_proj","o_proj","gate_proj","up_proj","down_proj"]))
    model.print_trainable_parameters()
    features=[]
    for row in rows:
        user=str(row["instruction"]).strip()
        if str(row.get("input","")).strip(): user+="\n\nInput:\n"+str(row["input"]).strip()
        prompt=[{"role":"system","content":SYSTEM},{"role":"user","content":user}]
        full=prompt+[{"role":"assistant","content":str(row["output"]).strip()}]
        prompt_ids=tok.apply_chat_template(prompt,tokenize=True,add_generation_prompt=True,enable_thinking=False)
        ids=tok.apply_chat_template(full,tokenize=True,add_generation_prompt=False,enable_thinking=False)[:a.max_length]
        labels=list(ids);labels[:min(len(prompt_ids),len(ids))]=[-100]*min(len(prompt_ids),len(ids))
        features.append({"input_ids":ids,"attention_mask":[1]*len(ids),"labels":labels})
    dataset=Dataset.from_list(features)
    cuda=torch.cuda.is_available()
    args=TrainingArguments(output_dir=a.output,num_train_epochs=a.epochs,learning_rate=a.learning_rate,per_device_train_batch_size=1,gradient_accumulation_steps=8,logging_steps=5,save_strategy="epoch",save_total_limit=2,report_to="none",fp16=cuda and not torch.cuda.is_bf16_supported(),bf16=cuda and torch.cuda.is_bf16_supported(),gradient_checkpointing=True,optim="adamw_torch",remove_unused_columns=False,dataloader_pin_memory=cuda)
    trainer=Trainer(model=model,args=args,train_dataset=dataset,data_collator=DataCollatorForSeq2Seq(tokenizer=tok,padding=True,label_pad_token_id=-100,return_tensors="pt"))
    trainer.train()
    Path(a.output).mkdir(parents=True,exist_ok=True)
    model.save_pretrained(a.output);tok.save_pretrained(a.output)
    print(json.dumps({"ok":True,"base_model":BASE_MODEL,"examples":len(rows),"adapter":a.output},indent=2))

if __name__=="__main__": main()
