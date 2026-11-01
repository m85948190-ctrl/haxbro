#!/usr/bin/env python3
"""Merge a trained LoRA adapter into the original SmolLM2 360M weights."""
from __future__ import annotations
import argparse
from pathlib import Path
import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM,AutoTokenizer
BASE_MODEL="HuggingFaceTB/SmolLM2-360M-Instruct"

def main():
    p=argparse.ArgumentParser(); p.add_argument("--adapter-dir",type=Path,required=True)
    p.add_argument("--output-dir",type=Path,default=Path("outputs/kai360m-merged"))
    p.add_argument("--base-model",default=BASE_MODEL); a=p.parse_args()
    dtype=torch.float16 if torch.cuda.is_available() else torch.float32
    base=AutoModelForCausalLM.from_pretrained(a.base_model,torch_dtype=dtype,low_cpu_mem_usage=True)
    tuned=PeftModel.from_pretrained(base,str(a.adapter_dir)); merged=tuned.merge_and_unload()
    a.output_dir.mkdir(parents=True,exist_ok=True); merged.save_pretrained(a.output_dir,safe_serialization=True)
    AutoTokenizer.from_pretrained(a.base_model).save_pretrained(a.output_dir)
    print(f"Merged model saved to {a.output_dir}; export/quantize and test before deployment.")

if __name__=="__main__": main()
