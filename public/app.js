const $ = id => document.getElementById(id);
const modelBase = {"Classic":350,"Piele Eco":450,"Catifea":500,"Acrilic":550,"Lemn":600};
const sizeExtra = {"30x30":0,"25x25":80,"20x30":120};
const pageExtra = {20:0,30:70,40:140,50:230};

function total(){
  return modelBase[$("model").value] + sizeExtra[$("size").value] + pageExtra[$("pages").value];
}
function update(){
  const t=total();
  $("total").textContent=t+" MDL";
  $("submitTotal").textContent=t+" MDL";
  $("sumModel").textContent=$("model").value;
  $("sumSize").textContent=$("size").value;
  $("sumPages").textContent=$("pages").value;
  const text=$("coverText").value.trim();
  $("bookText").innerHTML=text ? text.replace(/\n/g,"<br>") : "Amintiri<br>de neuitat";
}
["model","material","color","size","pages","coverText"].forEach(id=>$(id).addEventListener("input",update));

$("photos").addEventListener("change",e=>{
  const box=$("preview"); box.innerHTML="";
  [...e.target.files].slice(0,80).forEach(file=>{
    if(!file.type.startsWith("image/")) return;
    const img=document.createElement("img");
    img.src=URL.createObjectURL(file);
    img.title=file.name;
    box.appendChild(img);
  });
});

$("orderForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const result=$("result"); result.className="result"; result.textContent="Se transmite comanda...";
  const fd=new FormData(e.target);
  try{
    const r=await fetch("/api/orders",{method:"POST",body:fd});
    const data=await r.json();
    if(!r.ok) throw new Error(data.error||"Eroare");
    result.className="result ok";
    result.innerHTML=`<strong>Comanda #${data.orderId} a fost înregistrată.</strong><br>Total: ${data.total} MDL.<br>Te vom contacta pentru confirmarea detaliilor.`;
    e.target.reset(); $("preview").innerHTML=""; update();
    window.scrollTo({top:result.getBoundingClientRect().top+window.scrollY-120,behavior:"smooth"});
  }catch(err){
    result.className="result error";
    result.textContent=err.message;
  }
});
update();
