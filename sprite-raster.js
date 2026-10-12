/* Draw authored sprites from their original atlas directly at the final canvas resolution. */
(function(){
  'use strict';
  function resize(canvas,cssWidth,cssHeight,ratio=window.devicePixelRatio||1){
    const width=Math.max(1,Math.round(cssWidth*ratio)),height=Math.max(1,Math.round(cssHeight*ratio));
    if(canvas.width!==width)canvas.width=width;
    if(canvas.height!==height)canvas.height=height;
    return {width,height};
  }
  function prepare(canvas,width=canvas.rasterLogicalWidth||canvas.width,height=canvas.rasterLogicalHeight||canvas.height){
    canvas.rasterLogicalWidth=width;canvas.rasterLogicalHeight=height;
    if(canvas.style)canvas.style.aspectRatio=width+' / '+height;
    const box=canvas.getBoundingClientRect?.();
    resize(canvas,box?.width||canvas.clientWidth||width,box?.height||canvas.clientHeight||height);
    const g=canvas.getContext('2d');g.setTransform(canvas.width/width,0,0,canvas.height/height,0,0);
    return g;
  }
  function mirror(source,target){
    if(source.spriteSource)target.spriteSource={...source.spriteSource,flipX:!source.spriteSource.flipX};
    for(const key of ['artBounds','motionArtwork','motionPose','strayArtwork','generatedCat','generatedRear','spriteScale','footAnchor'])
      if(source[key]!==undefined)target[key]=source[key];
    return target;
  }
  function draw(g,image,x,y,width=image.width,height=image.height){
    const source=image.spriteSource;
    if(!source){g.drawImage(image,x,y,width,height);return;}
    const [dx,dy,dw,dh]=source.placement,sx=width/source.width,sy=height/source.height;
    g.save();
    // Filtering the original only once retains thin lines that nearest-neighbor
    // reductions previously discarded. Background/procedural pixel art keeps its own setting.
    g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
    if(source.flipX){g.translate(x+width,y);g.scale(-1,1);x=0;y=0;}
    g.drawImage(source.image,...source.crop,x+dx*sx,y+dy*sy,dw*sx,dh*sy);
    g.restore();
  }
  window.SpriteRaster={resize,prepare,mirror,draw};
})();
