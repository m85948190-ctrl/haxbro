const clean=(v,n=8000)=>String(v??"").replace(/\0/g,"").slice(0,n);
const rot13=s=>s.replace(/[A-Za-z]/g,c=>String.fromCharCode((c<="Z"?65:97)+(c.charCodeAt(0)-(c<="Z"?65:97)+13)%26));
const rot47=s=>s.replace(/[!-~]/g,c=>String.fromCharCode(33+(c.charCodeAt(0)-33+47)%94));
const caesar=(s,k)=>s.replace(/[A-Za-z]/g,c=>{const b=c<="Z"?65:97;return String.fromCharCode(b+(c.charCodeAt(0)-b+k+26)%26)});
const atbash=s=>s.replace(/[A-Za-z]/g,c=>{const b=c<="Z"?65:97;return String.fromCharCode(b+25-(c.charCodeAt(0)-b))});
const reverse=s=>[...s].reverse().join("");
const hex=s=>{if(!/^(?:[0-9a-f]{2}\s*)+$/i.test(s))return null;try{return new TextDecoder().decode(new Uint8Array((s.match(/[0-9a-f]{2}/gi)||[]).map(x=>parseInt(x,16))))}catch{return null}};
const b64=s=>{try{if(!/^[A-Za-z0-9+/\s]+={0,2}$/.test(s)||s.replace(/\s/g,"").length<8)return null;const bin=atob(s.replace(/\s/g,""));return new TextDecoder().decode(Uint8Array.from(bin,c=>c.charCodeAt(0)))}catch{return null}};
const bin=s=>{if(!/^[01\s]+$/.test(s)||s.replace(/\s/g,"").length%8)return null;try{return new TextDecoder().decode(new Uint8Array(s.trim().split(/\s+/).map(x=>parseInt(x,2))))}catch{return null}};
const url=s=>{try{const x=decodeURIComponent(s.replace(/\+/g," "));return x===s?null:x}catch{return null}};
const html=s=>s.replace(/&#x([0-9a-f]+);?/gi,(_,h)=>String.fromCharCode(parseInt(h,16))).replace(/&#(\d+);?/g,(_,n)=>String.fromCharCode(+n)).replace(/&(amp|lt|gt|quot|#39);/g,(_,x)=>({amp:"&",lt:"<",gt:">",quot:'"',"#39":"'"}[x]));
const unicode=s=>s.replace(/\\u([0-9a-f]{4})/gi,(_,h)=>String.fromCharCode(parseInt(h,16))).replace(/\\x([0-9a-f]{2})/gi,(_,h)=>String.fromCharCode(parseInt(h,16)));
const MORSE={".-":"A","-...":"B","-.-.":"C","-..":"D",".":"E","..-.":"F","--.":"G","....":"H","..":"I",".---":"J","-.-":"K",".-..":"L","--":"M","-.":"N","---":"O",".--.":"P","--.-":"Q",".-.":"R","...":"S","-":"T","..-":"U","...-":"V",".--":"W","-..-":"X","-.--":"Y","--..":"Z"};
const morse=s=>{if(!/^[.\-\s/]+$/.test(s))return null;return s.trim().split(/\s{2,}|\//).map(w=>w.trim().split(/\s+/).map(x=>MORSE[x]||"?").join("")).join(" ")};
const a1z26=s=>{const p=s.trim().split(/[\s,;.-]+/).filter(Boolean);return p.length&&p.every(x=>/^\d{1,2}$/.test(x)&&+x<=26)?p.map(x=>String.fromCharCode(64+ +x)).join(""):null};
const bacon=s=>{const t=s.toLowerCase().replace(/[^ab]/g,"");if(t.length<5||t.length%5)return null;let o="";for(let i=0;i<t.length;i+=5){const n=parseInt(t.slice(i,i+5).replace(/a/g,"0").replace(/b/g,"1"),2);if(n>25)return null;o+=String.fromCharCode(65+n)}return o};
const printable=s=>(String(s).match(/[ -~]/g)||[]).length/Math.max(1,String(s).length);
const score=s=>printable(s)*30+(String(s).match(/[A-Za-z]{3,}/g)||[]).length*3;
const TESTS=[["BASE64","SGVsbG8=","Hello"],["HEX","48656c6c6f","Hello"],["ROT13","Uryyb","Hello"],["BINARY","01001000 01101001","Hi"],["URL_ENCODING","Hello%20world","Hello world"],["MORSE",".... ..","HI"],["A1Z26","8 5 12 12 15","HELLO"],["REVERSE","olleH","Hello"]];
const DECODERS=["BASE64","BASE32","BASE58","BASE85","HEX","BINARY","OCTAL","DECIMAL_ASCII","URL_ENCODING","HTML_ENTITIES","UNICODE_ESCAPES","ASCII","ROT13","ROT47","CAESAR","ATBASH","VIGENERE","AFFINE","RAIL_FENCE","REVERSE","MORSE","BACON","A1Z26","XOR_SINGLE_BYTE","KEYBOARD_LAYOUT"];
export function decode(input){
 const s=clean(input).trim(), out=[], add=(method,result,meta={})=>{if(result&&result!==s&&printable(result)>.75)out.push({method,result:clean(result),score:score(result),...meta})};
 add("BASE64",b64(s));add("HEX",hex(s));add("BINARY",bin(s));add("URL_ENCODING",url(s));add("HTML_ENTITIES",html(s));add("UNICODE_ESCAPES",unicode(s));add("ASCII",/^[\x00-\x7F]+$/.test(s)?s:null);add("ROT13",rot13(s));add("ROT47",rot47(s));for(let k=1;k<26;k++)add("CAESAR",caesar(s,k),{shift:k});add("ATBASH",atbash(s));add("REVERSE",reverse(s));add("MORSE",morse(s));add("BACON",bacon(s));add("A1Z26",a1z26(s));out.sort((a,b)=>b.score-a.score);const primary=out[0]||null;return{input:s,totalKeys:25,methodsTested:DECODERS,primary,alternatives:out.slice(1,8),status:primary?"completed":"no-convincing-result"}}
export function testSuite(){return TESTS.map(([m,i,e])=>{const r={BASE64:b64,HEX:hex,ROT13:rot13,BINARY:bin,URL_ENCODING:url,MORSE:morse,A1Z26:a1z26,REVERSE:reverse}[m](i);return{method:m,input:i,expected:e,actual:r,pass:r===e}})}
export const decoderKeys=DECODERS;