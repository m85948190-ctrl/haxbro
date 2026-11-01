#!/usr/bin/env python3
"""Validate KAI SFT JSONL structure and prevent exact train/eval leakage."""
from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path

def load(path):
    rows=[]
    for n,line in enumerate(path.read_text(encoding="utf-8").splitlines(),1):
        if not line.strip(): continue
        try: row=json.loads(line)
        except json.JSONDecodeError as e: raise SystemExit(f"{path}:{n}: invalid JSON: {e}")
        msgs=row.get("messages")
        if not isinstance(msgs,list) or not msgs: raise SystemExit(f"{path}:{n}: messages must be a non-empty list")
        if not any(m.get("role")=="assistant" for m in msgs): raise SystemExit(f"{path}:{n}: missing assistant response")
        for m in msgs:
            if m.get("role") not in {"system","user","assistant"} or not isinstance(m.get("content"),str) or not m["content"].strip():
                raise SystemExit(f"{path}:{n}: invalid role or empty content")
        rows.append(row)
    return rows

def fingerprint(row):
    normalized=[(m["role"]," ".join(m["content"].lower().split())) for m in row["messages"]]
    return hashlib.sha256(json.dumps(normalized,ensure_ascii=False).encode()).hexdigest()

def main():
    p=argparse.ArgumentParser(); p.add_argument("--train",type=Path,default=Path("data/train.jsonl"))
    p.add_argument("--eval",type=Path,default=Path("data/eval.jsonl")); a=p.parse_args()
    train,ev=load(a.train),load(a.eval)
    train_hash={fingerprint(x) for x in train}; eval_hash={fingerprint(x) for x in ev}
    overlap=train_hash & eval_hash
    if overlap: raise SystemExit(f"FAIL: {len(overlap)} exact conversation(s) appear in both train and eval.")
    train_turns=sum(len(x["messages"]) for x in train); eval_turns=sum(len(x["messages"]) for x in ev)
    print(f"PASS: train={len(train)} conversations/{train_turns} turns; eval={len(ev)} conversations/{eval_turns} turns; no exact conversation leakage.")
    print("NOTE: structural validation is not a quality or safety evaluation; review the content and model outputs manually.")

if __name__=="__main__": main()
