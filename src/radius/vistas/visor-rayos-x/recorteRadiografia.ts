export async function recortarBordesNegros(origen:string) {
  const imagen = await new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('No se pudo analizar la radiografía para recortarla.'));img.src=origen});
  const ancho=imagen.naturalWidth,alto=imagen.naturalHeight;
  if(ancho<40||alto<40)return origen;
  const canvas=document.createElement('canvas');canvas.width=ancho;canvas.height=alto;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return origen;ctx.drawImage(imagen,0,0);
  const pixeles=ctx.getImageData(0,0,ancho,alto).data;
  let luminosidadMaxima=0;
  for(let i=0;i<pixeles.length;i+=Math.max(4,Math.floor(pixeles.length/40000/4)*4)){luminosidadMaxima=Math.max(luminosidadMaxima,pixeles[i],pixeles[i+1],pixeles[i+2])}
  const umbral=Math.max(7,Math.round(luminosidadMaxima*.035)),izquierdas=new Int32Array(alto),derechas=new Int32Array(alto);izquierdas.fill(-1);derechas.fill(-1);
  const visible=(x:number,y:number)=>{const i=(y*ancho+x)*4;return Math.max(pixeles[i],pixeles[i+1],pixeles[i+2])>=umbral};
  for(let y=0;y<alto;y++){
    for(let x=0;x<ancho-2;x++)if(visible(x,y)&&(visible(x+1,y)||visible(x+2,y))){izquierdas[y]=x;break}
    for(let x=ancho-1;x>1;x--)if(visible(x,y)&&(visible(x-1,y)||visible(x-2,y))){derechas[y]=x;break}
    if(derechas[y]-izquierdas[y]<ancho*.3){izquierdas[y]=-1;derechas[y]=-1}
  }
  let mejor={area:0,x:0,y:0,ancho,alto};
  for(let superior=0;superior<alto;superior++){
    if(izquierdas[superior]<0)continue;
    let izquierda=izquierdas[superior],derecha=derechas[superior];
    for(let inferior=superior;inferior<alto;inferior++){
      if(izquierdas[inferior]<0)break;
      izquierda=Math.max(izquierda,izquierdas[inferior]);derecha=Math.min(derecha,derechas[inferior]);
      if(derecha<=izquierda)break;
      const area=(derecha-izquierda+1)*(inferior-superior+1);
      if(area>mejor.area)mejor={area,x:izquierda,y:superior,ancho:derecha-izquierda+1,alto:inferior-superior+1};
    }
  }
  const proporcion=mejor.area/(ancho*alto),cambio=mejor.ancho<ancho*.985||mejor.alto<alto*.985;
  if(!cambio||proporcion<.48)return origen;
  const salida=document.createElement('canvas');salida.width=mejor.ancho;salida.height=mejor.alto;
  salida.getContext('2d')?.drawImage(canvas,mejor.x,mejor.y,mejor.ancho,mejor.alto,0,0,mejor.ancho,mejor.alto);
  return salida.toDataURL('image/jpeg',.95);
}
