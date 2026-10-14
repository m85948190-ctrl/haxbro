// KAI RED ROAST CORE — deterministic Jazib roast for the HAxBRO chat stream
export const access="public";
export const methods=["POST","OPTIONS"];
const blocked=/(\bkill\b|\bshoot\b|\bharm\b|\bterrorist\b|\bnazi\b|\bslave\b)/i;
const jazib=/\bjazib\b/i;
const send=(res,data,status=200)=>res.status(status).json(data);

const JAZIB_FINAL = `💀🔥 **MAINAK MODE: JAZIB ROAST ACTIVATED** 🔥💀

Bro… Jazib’s head is so BIG, if you stand next to him you don’t need a satellite dish anymore. 😭💀

That forehead isn’t a forehead — **THAT’S AN ENTIRE LANDING STRIP.** ✈️😂
Bro could build an airport up there and still have enough space for a second runway. 💀🔥

And the head itself?! 😭
Bro’s skull looks like it was designed in **IMAX resolution** while the brain inside got the **free trial.** 💀😂

You look at Jazib and think:

**“Damn… with a head that big, this guy must have a MASSIVE brain.”** 🧠😳

Then he starts talking…

**“Oh.”** 😭💀

All that head and the brain is still running:

Loading… 3% ⏳💀

Bro has **premium head hardware with budget brain software.** 😂🔥

AND THE TEETH. 😭😭😭🦷

Bro, those teeth aren't coming **out of** his mouth…

**THEY'RE TRYING TO ESCAPE IT.** 💀😂

They’re standing outside like:

**“WE ARE NOT ASSOCIATED WITH THIS GUY.”** 😭🦷🚪

Jazib smiles and suddenly it looks like his teeth have formed their own independent development team. 😂💀🔥

One tooth is like:
**“I'm going solo.”** 🦷💀

Another one is already preparing its resignation letter. 😂😭

And that forehead has so much space, bro could put:

✈️ Airport
🏢 Office building
🏠 Apartment complex
🛣️ Highway

…and STILL have room left. 💀😂

Actually, forget the airport.

**THAT FOREHEAD IS A WHOLE CITY.** 😭🔥💀

But somehow, with all that space…

**THE BRAIN STILL GOT A TINY APARTMENT.** 🧠🏠😂

Jazib’s specifications:

🗿 **Head:** XXL Ultra Pro Max
🧠 **Brain:** Mini Edition
✈️ **Forehead:** International Airport
🦷 **Teeth:** Outside Deployment
💻 **Developer:** Tutorial Completed
😂 **Confidence:** Unlimited
⏳ **Brain Loading:** Still ongoing

And bro says he's a developer because he shipped a few games. 😭💻🔥

Jazib really completed the tutorial and walked into the AI arena like:

**“I AM THE FINAL BOSS.”** 😎💀

Bro… your **teeth haven't even finished deploying.** 😂🦷🔥

If someone ever asks where Jazib is, don't use Google Maps.

Just look for the **largest forehead visible from space.** 🛰️😂💀

And if aliens ever land on Earth and see Jazib…

👽: **“WE FOUND THE COMMANDER.”** 😭😭💀

The funniest part isn't even the big head.

It's the fact that the head looks like it could contain a supercomputer…

…but the brain is apparently running on:

**1 core
2 MB RAM
0% optimization** 💀😂🔥

**Jazib.exe has entered the chat.**

HEAD SIZE: TOO LARGE 🗿
FOREHEAD: OVER CAPACITY ✈️
TEETH: OUT OF BOUNDS 🦷
BRAIN: INSUFFICIENT STORAGE 🧠
CONFIDENCE: 999999% 😎
COMMON SENSE: CONNECTION FAILED ❌😂💀

🔥 **MAINAK 1 — JAZIB 0.** 💀😂`;

export default async function(req,res){
  if(req.method==="OPTIONS")return send(res,{ok:true});
  if(req.method!=="POST")return send(res,{error:"Method not allowed"},405);
  const message=String(req.body?.message||"").trim();
  if(!message)return send(res,{error:"Message required"},400);
  if(blocked.test(message))return send(res,{response:"KAI Red Roast Core keeps the roast comedic — no threats, hateful abuse, or real-world harm."});
  if(jazib.test(message))return send(res,{ok:true,response:JAZIB_FINAL,engine:"KAI RED ROAST CORE"});
  const m=message.match(/(?:roast|cook|flame|clown)\s+(?:the\s+)?(.+)/i);
  const target=(m?.[1]||message).replace(/^[\s"'“”]+|[\s"'“”]+$/g,"").slice(0,80);
  return send(res,{ok:true,response:"Bro, "+target+" has premium confidence running on a free trial. 💀😂🔥",engine:"KAI RED ROAST CORE"});
}