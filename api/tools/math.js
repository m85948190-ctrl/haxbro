import { create, all } from "mathjs";

const math = create(all, { number: "BigNumber", precision: 100 });
const clean = (v,n=500) => String(v ?? "").replace(/[\u0000-\u001f]/g," ").trim().slice(0,n);
const allowed = s => /^[0-9a-zA-Z_+\-*/^().,%\s=]+$/.test(s) && !/\b(import|createUnit|evaluate|parse|simplify|derivative|help|expression|assignment)\b/i.test(s);

function format(v) {
  if (v && typeof v.toString === "function") return v.toString();
  return String(v);
}
function solveEquation(input, variable) {
  const parts = input.split("=");
  if (parts.length !== 2) throw new Error("Write an equation like 2*x + 3 = 11.");
  const expr = math.simplify("(" + parts[0] + ")-(" + parts[1] + ")");
  const evaluateAt = n => math.evaluate(expr.toString(), { [variable]: math.bignumber(n) });
  const zero = evaluateAt(0), plus = evaluateAt(1), minus = evaluateAt(-1);
  const two = math.bignumber(2);
  const c0 = zero;
  const c1 = math.divide(math.subtract(plus, minus), two);
  const c2 = math.subtract(math.divide(math.add(plus, minus), two), c0);
  if (!math.isZero(c2)) {
    const discriminant = math.subtract(math.multiply(c1,c1), math.multiply(math.bignumber(4),math.multiply(c2,c0)));
    const d = Number(discriminant.toString());
    if (d < 0) return { result: "No real roots.", steps: ["Reduced to a quadratic equation.", "The discriminant is negative."] };
    const a=Number(c2.toString()), b=Number(c1.toString()), c=Number(c0.toString());
    const root1=(-b+Math.sqrt(d))/(2*a), root2=(-b-Math.sqrt(d))/(2*a);
    return { result: root1===root2 ? variable+" = "+root1 : variable+" = "+root1+" or "+root2, steps:["Reduced equation: "+expr.toString()+" = 0","Applied the quadratic formula."] };
  }
  if (!math.isZero(c1)) {
    const root=math.divide(math.unaryMinus(c0),c1);
    return {result:variable+" = "+format(root),steps:["Reduced equation: "+expr.toString()+" = 0","Isolated "+variable+"."]};
  }
  if (math.isZero(c0)) return {result:"Every value of "+variable+" is a solution.",steps:["Both sides reduce to the same expression."]};
  return {result:"No solution.",steps:["The equation reduces to a nonzero constant."]};
}

export default async function handler(req,res) {
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({ok:false,error:"Use POST."});}
  const expression=clean(req.body?.expression,500);
  const operation=clean(req.body?.operation||"evaluate",30).toLowerCase();
  const variable=clean(req.body?.variable||"x",20);
  if(!expression)return res.status(400).json({ok:false,error:"Enter an expression."});
  if(!allowed(expression)||!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable))return res.status(400).json({ok:false,error:"Unsupported characters or variable."});
  try {
    let result,steps=[];
    if(operation==="solve") {
      const solved=solveEquation(expression,variable);result=solved.result;steps=solved.steps;
    } else if(operation==="simplify") {
      result=math.simplify(expression).toString();steps=["Simplified the symbolic expression."];
    } else if(operation==="derivative") {
      result=math.derivative(expression,variable).toString();steps=["Differentiated with respect to "+variable+"."];
    } else if(operation==="expand") {
      result=math.simplify(expression).toString();steps=["Expression normalized. For full polynomial expansion, use the algebra workspace."];
    } else {
      const value=math.evaluate(expression);
      result=format(value);
      steps=["Evaluated using the built-in math engine with arbitrary-precision decimal arithmetic."];
    }
    return res.status(200).json({ok:true,operation,expression,result,steps,engine:"HAxBRO deterministic math engine"});
  } catch(error) {
    return res.status(400).json({ok:false,error:clean(error?.message||"Could not process this expression.",240)});
  }
}
