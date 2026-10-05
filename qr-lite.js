// Minimal self-contained QR Code generator for RemoteView.
// QR Model 2, Version 5, error correction level L, byte mode.
// Capacity: up to 106 UTF-8 bytes.
export function makeQrMatrix(text) {
  const data = new TextEncoder().encode(text);
  if (data.length > 106) throw new Error("QR payload too long");
  const SIZE=37, DATA=108, ECC=26, MASK=0;
  const bits=[];
  const add=(v,n)=>{for(let i=n-1;i>=0;i--)bits.push((v>>>i)&1)};
  add(0b0100,4); add(data.length,8); for(const b of data)add(b,8);
  const cap=DATA*8, term=Math.min(4,cap-bits.length);
  for(let i=0;i<term;i++)bits.push(0);
  while(bits.length%8)bits.push(0);
  const d=[];
  for(let i=0;i<bits.length;i+=8){let b=0;for(let j=0;j<8;j++)b=(b<<1)|bits[i+j];d.push(b)}
  for(let p=0;d.length<DATA;p++)d.push(p%2?0x11:0xEC);
  const cw=d.concat(rs(d,ECC));
  const m=Array.from({length:SIZE},()=>Array(SIZE).fill(false));
  const fn=Array.from({length:SIZE},()=>Array(SIZE).fill(false));
  const set=(x,y,v)=>{if(x<0||y<0||x>=SIZE||y>=SIZE)return;m[y][x]=!!v;fn[y][x]=true};
  const finder=(cx,cy)=>{for(let dy=-1;dy<=7;dy++)for(let dx=-1;dx<=7;dx++){const x=cx+dx,y=cy+dy;if(x<0||y<0||x>=SIZE||y>=SIZE)continue;const inr=dx>=0&&dx<=6&&dy>=0&&dy<=6;set(x,y,inr&&(dx===0||dx===6||dy===0||dy===6||(dx>=2&&dx<=4&&dy>=2&&dy<=4)))}}; 
  const align=(cx,cy)=>{for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)set(cx+dx,cy+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1)};
  finder(0,0); finder(SIZE-7,0); finder(0,SIZE-7);
  for(let i=8;i<SIZE-8;i++){set(i,6,i%2===0);set(6,i,i%2===0)}
  align(30,30);
  const fmt=formatBits((0b01<<3)|MASK), fb=i=>((fmt>>>i)&1)!==0;
  for(let i=0;i<=5;i++)set(8,i,fb(i)); set(8,7,fb(6)); set(8,8,fb(7)); set(7,8,fb(8));
  for(let i=9;i<15;i++)set(14-i,8,fb(i));
  for(let i=0;i<8;i++)set(SIZE-1-i,8,fb(i));
  for(let i=8;i<15;i++)set(8,SIZE-15+i,fb(i));
  set(8,SIZE-8,true);
  let bi=0,up=true;
  for(let right=SIZE-1;right>=1;right-=2){
    if(right===6)right--;
    for(let i=0;i<SIZE;i++){
      const y=up?SIZE-1-i:i;
      for(let j=0;j<2;j++){
        const x=right-j;if(fn[y][x])continue;
        let dark=false;
        if(bi<cw.length*8){dark=((cw[bi>>>3]>>>(7-(bi&7)))&1)!==0;bi++}
        if((x+y)%2===0)dark=!dark;
        m[y][x]=dark;
      }
    }
    up=!up;
  }
  return m;
}
export function drawQr(canvas,text){
  const m=makeQrMatrix(text),q=4,s=5,n=m.length,px=(n+q*2)*s;
  canvas.width=px;canvas.height=px;
  const c=canvas.getContext("2d");c.imageSmoothingEnabled=false;c.fillStyle="#fff";c.fillRect(0,0,px,px);c.fillStyle="#000";
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(m[y][x])c.fillRect((x+q)*s,(y+q)*s,s,s);
}
function formatBits(v){let r=v<<10,g=0x537;for(let i=14;i>=10;i--)if((r>>>i)&1)r^=g<<(i-10);return(((v<<10)|r)^0x5412)&0x7FFF}
function rs(data,deg){const g=gen(deg),r=new Array(deg).fill(0);for(const b of data){const f=b^r[0];r.shift();r.push(0);for(let i=0;i<deg;i++)r[i]^=mul(g[i+1],f)}return r}
function gen(deg){let p=[1],root=1;for(let i=0;i<deg;i++){p=pmul(p,[1,root]);root=mul(root,2)}return p}
function pmul(a,b){const o=new Array(a.length+b.length-1).fill(0);for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)o[i+j]^=mul(a[i],b[j]);return o}
function mul(x,y){let z=0;for(let i=0;i<8;i++){if(y&1)z^=x;y>>>=1;x<<=1;if(x&0x100)x^=0x11D}return z&255}
