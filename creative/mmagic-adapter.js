// HAxBRO adapter boundary for OpenMMLab MMagic/MMDeploy.
// No OpenMMLab source is copied here. Install the upstream package in the
// build environment and call its documented APIs from this adapter.
export function createMMagicAdapter({runner}={}){
  if(typeof runner!=="function") return {available:false,generate:async()=>{throw new Error("MMagic runner is not configured")}};
  return {
    available:true,
    async generate(job){return runner(job)}
  };
}
