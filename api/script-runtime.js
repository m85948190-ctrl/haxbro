import { storage } from 'hatchable';
export const access='public';
export const methods=['GET'];
export default async function(req,res){const item=await storage.get('runtime/script-haxbro-workspace.js');if(!item?.buffer)return res.status(404).send('');res.setHeader('content-type','application/javascript; charset=utf-8');res.setHeader('cache-control','no-store');res.send(item.buffer);}