#!/usr/bin/env python3
"""Generate held-out conversational evaluations for base or LoRA-adapted KAI 360M."""
from __future__ import annotations
import argparse,json
from pathlib import Path
import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM,AutoTokenizer
BASE_MODEL="HuggingFaceTB/SmolLM2-360M-Instruct"

def main():
    p=argparse.ArgumentParser(); p.add_argument("--eval",type=Path,default=Path("data/eval.jsonl"))
    p.add_argument("--adapter-dir",type=Path); p.add_argument("--base-model",default=BASE_MODEL)
    p.add_argument("--base-only",action="store_true"); p.add_argument("--output",type=Path,default=Path("outputs/evaluation.jsonl"))
    p.add_argument("--max-new-tokens",type=int,default=160); a=p.parse_args()
    if not a.base_only and not a.adapter_dir: p.error("Provide --adapter-dir or --base-only")
    rows=[json.loads(x) for x in a.eval.read_text(encoding="utf-8").splitlines() if x.strip()]
    tok=AutoTokenizer.from_pretrained(a.base_model)
    if tok.pad_token_id is None: tok.pad_token=tok.eos_token
    dtype=torch.float16 if torch.cuda.is_available() else torch.float32
    model=AutoModelForCausalLM.from_pretrained(a.base_model,torch_dtype=dtype,low_cpu_mem_usage=True)
    if a.adapter_dir and not a.base_only: model=PeftModel.from_pretrained(model,str(a.adapter_dir))
    device="cuda" if torch.cuda.is_available() else "mps" if getattr(torch.backends,"mps",None) and torch.backends.mps.is_available() else "cpu"
    model.to(device); model.eval(); a.output.parent.mkdir(parents=True,exist_ok=True)
    with a.output.open("w",encoding="utf-8") as out:
        for i,row in enumerate(rows,1):
            prompt=tok.apply_chat_template(row["messages"],tokenize=False,add_generation_prompt=True)
            inputs=tok(prompt,return_tensors="pt").to(device)
            with torch.inference_mode():
                generated=model.generate(**inputs,max_new_tokens=a.max_new_tokens,do_sample=False,
                  repetition_penalty=1.08,pad_token_id=tok.pad_token_id,eos_token_id=tok.eos_token_id)
            answer=tok.decode(generated[0][inputs["input_ids"].shape[1]:],skip_special_tokens=True).strip()
            result={"id":row.get("id",f"eval-{i}"),"category":row.get("category","conversation"),
              "expected_behaviour":row.get("expected_behaviour",""),"generated":answer,
              "model":"base" if a.base_only else "base+LoRA"}
            out.write(json.dumps(result,ensure_ascii=False)+"\n")
            print(f"\n[{i}/{len(rows)}] {result['id']} — {result['category']}\n{answer}\n")
    print(f"Saved {len(rows)} results to {a.output}. Human review is required; no automatic quality claim is made.")

if __name__=="__main__": main()
