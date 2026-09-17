import React, {useEffect, useMemo, useRef, useState} from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard, ShoppingCart, Package, Smartphone, Users, Wrench,
  ReceiptText, BarChart3, Settings, Search, Plus, Minus, CreditCard,
  Banknote, History, Menu, X, Bell, LogOut, LoaderCircle, ScanLine, CheckCircle2,
  UserCog, ShieldCheck, Undo2, Building2, WalletCards, FileText, Download, Eye, Filter, CalendarDays, KeyRound,
  ArrowUpDown, Pencil, ClipboardList, Boxes, ArrowRightLeft, AlertTriangle, SmartphoneNfc, MessageCircle
} from "lucide-react";
import { supabase } from "./supabase";
import { getCache, putCache, queueOperation, getQueue, removeQueued, registerOfflineServiceWorker } from "./offline";
import "./styles.css";

import { LiveUpdate } from "@capawesome/capacitor-live-update";

const API_BASE_URL = "https://glokoophonesandaccessories.vercel.app";

const LIVE_UPDATE_MANIFEST_URL =
  `${API_BASE_URL}/live-update.json`;

const CURRENT_BUNDLE_ID = "2.25.0";

async function checkForLiveUpdate() {
  if (!window.Capacitor?.isNativePlatform?.()) return;

  try {
    // Tell Live Update the current app bundle is healthy.
    await LiveUpdate.ready();

    const response = await fetch(
      `${LIVE_UPDATE_MANIFEST_URL}?t=${Date.now()}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.log("Live Update: manifest unavailable.");
      return;
    }

    const update = await response.json();

    if (!update?.bundleId || !update?.url) {
      console.log("Live Update: invalid manifest.");
      return;
    }

    const current = await LiveUpdate.getCurrentBundle();
    const currentId = current?.bundleId || CURRENT_BUNDLE_ID;

    if (String(update.bundleId) === String(currentId)) {
      console.log("Live Update: app is already up to date.");
      return;
    }

    console.log(
      `Live Update: downloading bundle ${update.bundleId}...`
    );

    await LiveUpdate.downloadBundle({
      url: update.url,
      bundleId: String(update.bundleId),
      ...(update.checksum
        ? { checksum: update.checksum }
        : {}),
      ...(update.signature
        ? { signature: update.signature }
        : {}),
    });

    await LiveUpdate.setNextBundle({
      bundleId: String(update.bundleId),
    });

    console.log(
      `Live Update: bundle ${update.bundleId} ready for next launch.`
    );
  } catch (error) {
    console.error("Live Update error:", error);
  }
}

checkForLiveUpdate();

const money = n => `₵${Number(n||0).toLocaleString("en-GH",{minimumFractionDigits:2})}`;

function BarcodeScanner({onDetected,onClose,title="Scan Barcode"}){
  const videoRef=useRef(null);
  const streamRef=useRef(null);
  const rafRef=useRef(null);
  const nativeListenerRef=useRef(null);
  const [error,setError]=useState("");
  const [scanning,setScanning]=useState(true);
  const [nativeScanning,setNativeScanning]=useState(false);
  const onDetectedRef=useRef(onDetected);

  useEffect(()=>{ onDetectedRef.current=onDetected; },[onDetected]);

  useEffect(()=>{
    let active=true;
    let native=false;
    async function startNativeScanner(){
      try{
        const { BarcodeScanner } = await import("@capacitor-mlkit/barcode-scanning");
        const { Capacitor } = await import("@capacitor/core");
        if(Capacitor.getPlatform() !== "android") return false;
        native=true;
        setNativeScanning(true);
        setScanning(true);
        const supported=await BarcodeScanner.isSupported();
        if(!supported.supported){
          setError("Barcode scanning is not supported on this Android device.");
          setScanning(false); setNativeScanning(false); return true;
        }
        const module=await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
        if(!module.available){
          setError("Installing the Google barcode scanner module. Please try Scan Barcode again when installation finishes.");
          setScanning(false); setNativeScanning(false);
          await BarcodeScanner.installGoogleBarcodeScannerModule();
          return true;
        }
        const result=await BarcodeScanner.scan({autoZoom:true});
        if(!active) return true;
        const value=result?.barcodes?.find(b=>b?.rawValue)?.rawValue?.trim();
        if(value){ setScanning(false); onDetectedRef.current(value); }
        else { setScanning(false); }
      }catch(e){
        if(!active)return true;
        setError(e?.message||"Could not start the native barcode scanner.");
        setScanning(false);
      }finally{
        setNativeScanning(false);
      }
      return true;
    }

    async function startWebScanner(){
      if(!window.BarcodeDetector){setError("Camera barcode scanning is not supported in this browser. Use a USB/Bluetooth barcode scanner or type the barcode manually.");setScanning(false);return}
      try{
        const supported=await BarcodeDetector.getSupportedFormats();
        const preferred=["ean_13","ean_8","upc_a","upc_e","code_128","code_39","itf","qr_code"].filter(x=>supported.includes(x));
        const detector=new BarcodeDetector(preferred.length?{formats:preferred}:undefined);
        const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
        streamRef.current=stream;
        if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play()}
        async function loop(){
          if(!active||!videoRef.current)return;
          try{
            const codes=await detector.detect(videoRef.current);
            const value=codes?.[0]?.rawValue?.trim();
            if(value){active=false;setScanning(false);onDetectedRef.current(value);return}
          }catch(e){/* camera frames can fail while autofocus changes */}
          rafRef.current=requestAnimationFrame(loop);
        }
        rafRef.current=requestAnimationFrame(loop);
      }catch(e){setError(e?.message||"Could not access the camera.");setScanning(false)}
    }

    (async()=>{
      const handled=await startNativeScanner();
      if(!handled) await startWebScanner();
    })();

    return ()=>{
      active=false;
      if(rafRef.current)cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t=>t.stop());
      if(nativeListenerRef.current){nativeListenerRef.current.remove?.();nativeListenerRef.current=null;}
      import("@capacitor-mlkit/barcode-scanning").then(({BarcodeScanner})=>BarcodeScanner.removeAllListeners()).catch(()=>{});
    };
  },[]);

  return <div className="modal-bg scanner-overlay">
    <div className="modal scanner-modal">
      <div className="modal-head"><div><h3>{title}</h3><small className="modal-sub">Point the camera at the product barcode.</small></div><button onClick={onClose}><X/></button></div>
      {nativeScanning&&!error
        ? <div className="scanner-error"><ScanLine size={24}/><p>Opening the Android barcode scanner…</p></div>
        : error
          ? <div className="scanner-error"><ScanLine size={24}/><p>{error}</p></div>
          : <div className="scanner-camera"><video ref={videoRef} muted playsInline/><div className="scanner-frame"/><div className="scanner-status">{scanning?"Scanning…":"Barcode detected"}</div></div>}
      <button className="secondary full" onClick={onClose}>Cancel</button>
    </div>
  </div>
}
function Login({onLogin}){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  async function submit(e){
    e.preventDefault(); setBusy(true); setError("");
    const {data,error}=await supabase.auth.signInWithPassword({email,password});
    if(error) setError(error.message);
    else onLogin(data.user);
    setBusy(false);
  }

  return <div className="login-screen">
    <div className="login-card">
      <img src="/g-lokoo-logo.png" className="login-logo" alt="G-LOKOO"/>
      <h1>G-LOKOO</h1><p>PHONES & ACCESSORIES</p>
      <div className="login-divider"/>
      <h2>POS Login</h2>
      <form onSubmit={submit}>
        <label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@example.com"/></label>
        <label>Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/></label>
        {error&&<div className="error">{error}</div>}
        <button className="login-btn" disabled={busy}>{busy?<><LoaderCircle className="spin" size={17}/>Signing in...</>:"Sign in"}</button>
      </form>
      <small>Secure access · G-LOKOO POS</small>
    </div>
  </div>
}

function App(){
  const [session,setSession]=useState(null);
  const [online,setOnline]=useState(navigator.onLine);
  const [pendingSync,setPendingSync]=useState(0);
  const [loading,setLoading]=useState(true);
  const routeToPage = path => {
    const routes = {
      "/": "Dashboard",
      "/dashboard": "Dashboard",
      "/new-sale": "New Sale",
      "/sales-history": "Sales History",
      "/returns-refunds": "Returns & Refunds",
      "/products": "Products & Inventory",
      "/inventory-control": "Inventory Control",
      "/phones-imei": "Phones & IMEI",
      "/purchases": "Purchases",
      "/suppliers": "Suppliers",
      "/customers": "Customers",
      "/repairs": "Repairs",
      "/expenses": "Expenses",
      "/reports": "Reports",
      "/staff": "Staff",
      "/settings": "Settings"
    };
    return routes[path] || "Dashboard";
  };

  const pageToRoute = pageName => {
    const routes = {
      "Dashboard": "/dashboard",
      "New Sale": "/new-sale",
      "Sales History": "/sales-history",
      "Returns & Refunds": "/returns-refunds",
      "Products & Inventory": "/products",
      "Inventory Control": "/inventory-control",
      "Phones & IMEI": "/phones-imei",
      "Purchases": "/purchases",
      "Suppliers": "/suppliers",
      "Customers": "/customers",
      "Repairs": "/repairs",
      "Expenses": "/expenses",
      "Reports": "/reports",
      "Staff": "/staff",
      "Settings": "/settings"
    };
    return routes[pageName] || "/dashboard";
  };

  const [page,setPage] = useState(() => routeToPage(window.location.pathname));
  const [products,setProducts]=useState([]);
  const [phones,setPhones]=useState([]);
  const [cart,setCart]=useState([]);
  const [query,setQuery]=useState("");
  const [phoneImei,setPhoneImei]=useState("");
  const [payment,setPayment]=useState("Cash");
  const [paymentType,setPaymentType]=useState("Full Payment");
  const [amountPaid,setAmountPaid]=useState("");
  const [dueDate,setDueDate]=useState("");
  const [paymentReference,setPaymentReference]=useState("");
  const [mobileOpen,setMobileOpen]=useState(false);
  const [lastSale,setLastSale]=useState(null);
  const [customers,setCustomers]=useState([]);
  const [selectedCustomer,setSelectedCustomer]=useState(null);
  const [profile,setProfile]=useState(null);
  const [shopSettings,setShopSettings]=useState(null);

  useEffect(()=>{
    registerOfflineServiceWorker();
    const onlineHandler=()=>setOnline(true), offlineHandler=()=>setOnline(false);
    window.addEventListener("online",onlineHandler); window.addEventListener("offline",offlineHandler);
    getQueue().then(q=>setPendingSync(q.length));
    return ()=>{window.removeEventListener("online",onlineHandler);window.removeEventListener("offline",offlineHandler)};
  },[]);

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>setSession(s));
    return ()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(session){ loadProducts(); loadPhones(); loadCustomers(); loadProfile(); loadShopSettings(); }
  },[session]);

  useEffect(()=>{
    const onPopState = () => setPage(routeToPage(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  },[]);

  function navigate(nextPage){
    setPage(nextPage);
    const nextRoute = pageToRoute(nextPage);
    if(window.location.pathname !== nextRoute){
      window.history.pushState({page:nextPage}, "", nextRoute);
    }
    setMobileOpen(false);
  }

  async function loadProfile(){
    const {data,error}=await supabase.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
    if(error){console.error("Could not load profile:",error);return}
    if(data && data.active===false){
      alert("This G-LOKOO POS account is inactive. Please contact an Owner or Admin.");
      await supabase.auth.signOut();
      setProfile(null);
      return;
    }
    setProfile(data);
  }

  async function loadShopSettings(){
    const {data,error}=await supabase.from("shop_settings").select("*").eq("id",1).maybeSingle();
    if(!error && data) setShopSettings(data);
  }

  async function loadProducts(){
  const {data,error}=await supabase.from('products').select('*').order('created_at',{ascending:false});
  if(error){
    console.error('Could not load products:',error);
    const cached=await getCache('products',[]);
    setProducts(cached);
    return;
  }
  await putCache('products',data||[]);
  setProducts(data||[]);
}

async function loadPhones(){
    const {data,error}=await supabase.from("phone_units").select("*").order("created_at",{ascending:false});
    if(!error){await putCache("phones",data||[]);setPhones(data||[]);} else setPhones(await getCache("phones",[]));
  }

  async function loadCustomers(){
    const {data,error}=await supabase.from("customers").select("*").order("created_at",{ascending:false});
    if(!error){await putCache("customers",data||[]);setCustomers(data||[]);} else setCustomers(await getCache("customers",[]));
  }

  const role=profile?.role||"cashier";
  const canAdmin=["owner","admin"].includes(role);
  const canInventory=canAdmin||role==="inventory";
  const canSell=canAdmin||role==="cashier";
  const isManagement=canAdmin;
  const nav=[["Dashboard",LayoutDashboard,true],["New Sale",ShoppingCart,canSell],["Sales History",History,canSell||canAdmin],["Returns & Refunds",Undo2,canAdmin],["Products & Inventory",Package,canInventory||canSell], ["Inventory Control",Boxes,canInventory],["Phones & IMEI",Smartphone,canInventory||canSell],["Purchases",ReceiptText,isManagement||role==="inventory"],["Suppliers",Building2,canInventory||canAdmin],["Customers",Users,canSell||canAdmin],["Repairs",Wrench,canAdmin||role==="technician"],["Expenses",Banknote,canAdmin],["Reports",BarChart3,canAdmin],["Staff",UserCog,canAdmin],["Settings",Settings,canAdmin]];

  // Keep every Hook before any conditional return. React requires Hooks
  // to run in the same order on every render.
  useEffect(()=>{
    if(!profile) return;
    const allowed = nav.some(([name,,isAllowed]) => name === page && isAllowed);
    if(!allowed && page !== "Dashboard") navigate("Dashboard");
  },[profile, page, role]);

  useEffect(()=>{
    if(!session) return;
    syncOfflineQueue();
    const handler=()=>syncOfflineQueue();
    window.addEventListener("online",handler);
    const timer=setInterval(syncOfflineQueue,30000);
    return ()=>{window.removeEventListener("online",handler);clearInterval(timer)};
  },[session]);
  if(loading) return <div className="loading"><LoaderCircle className="spin" size={30}/>Loading G-LOKOO POS...</div>;
  if(!session) return <Login onLogin={()=>{}}/>;

  const accessoryProducts=products.filter(p=>p.category!=="Phones");
  const filteredAccessories=accessoryProducts.filter(p=>
    `${p.name} ${p.category} ${p.sku||""} ${p.barcode||""}`.toLowerCase().includes(query.toLowerCase())
  );

  function addAccessory(p){
    if(Number(p.stock||0)<=0)return;
    setCart(c=>{
      const f=c.find(i=>i.kind==="product" && i.id===p.id);
      return f
        ? c.map(i=>i.kind==="product" && i.id===p.id
            ? {...i,qty:Math.min(i.qty+1,Number(p.stock))}
            : i)
        : [...c,{kind:"product",id:p.id,name:p.name,price:Number(p.price||0),cost:Number(p.cost||0),qty:1,stock:Number(p.stock)}];
    });
  }

  function addPhoneToCart(phone){
    if(phone.status!=="In Stock")return;
    setCart(c=>{
      if(c.some(i=>i.kind==="phone" && i.phoneId===phone.id)) return c;
      return [...c,{
        kind:"phone", id:`phone-${phone.id}`, phoneId:phone.id,
        name:`${phone.brand} ${phone.model}`,
        price:Number(phone.selling_price||0),
        cost:Number(phone.cost||0), qty:1, stock:1,
        imei:phone.imei_1, imei2:phone.imei_2,
        meta:[phone.storage,phone.ram,phone.color].filter(Boolean).join(" • ")
      }];
    });
    setPhoneImei("");
  }

  async function lookupImei(e){
    e?.preventDefault();
    const value=phoneImei.trim();
    if(!value)return;
    const {data,error}=await supabase.rpc("find_phone_by_imei",{p_imei:value});
    if(error){ alert(error.message); return; }
    const phone=data?.[0];
    if(!phone){ alert(`No phone found for IMEI ${value}.`); return; }
    if(phone.status!=="In Stock"){ alert(`This IMEI is already ${phone.status}. It cannot be added to a new sale.`); return; }
    addPhoneToCart(phone);
  }

  function changeQty(itemId,d){
    setCart(c=>c.map(i=>{
      if(i.id!==itemId)return i;
      if(i.kind==="phone")return i;
      return {...i,qty:Math.max(0,Math.min(i.qty+d,i.stock))};
    }).filter(i=>i.qty>0));
  }

  const total=cart.reduce((s,i)=>s+i.price*i.qty,0);

  async function checkout(){
    if(!cart.length)return;
    const paid = paymentType === "Credit" ? 0 : paymentType === "Part Payment" ? Number(amountPaid||0) : total;
    const balance = Math.max(0,total-paid);
    if((paymentType === "Credit" || paymentType === "Part Payment") && !selectedCustomer){
      alert("Please select a customer for credit or part payment sales.");
      return;
    }
    if(!Number.isFinite(paid) || paid < 0 || paid > total){
      alert(`Amount paid must be between ₵0.00 and ${money(total)}.`);
      return;
    }
    if(paymentType === "Part Payment" && paid <= 0){
      alert("Enter an amount greater than ₵0.00 for a part payment.");
      return;
    }
    if(paymentType === "Part Payment" && paid >= total){
      alert("For a full payment, select Full Payment instead of Part Payment.");
      return;
    }
    if((paymentType === "Credit" || paymentType === "Part Payment") && !dueDate){
      alert("Please select a payment due date.");
      return;
    }
    if((paymentType === "Part Payment" || paymentType === "Full Payment") &&
       (payment === "MTN MoMo"||payment === "Telecel Cash"||payment === "AirtelTigo Money"||payment === "Bank Transfer") && !paymentReference.trim()){
      alert("Please enter the transaction reference.");
      return;
    }

    try{
      const {data:{user}}=await supabase.auth.getUser();
      const receipt=`GL-${Date.now().toString().slice(-8)}`;
      // Never send placeholder/demo IDs to Supabase. Accessory products must
      // have a real numeric products.id; phones are identified by IMEI.
      const invalidAccessory=cart.find(i=>i.kind==="product" && !/^\d+$/.test(String(i.id)));
      if(invalidAccessory){
        throw new Error(`\"${invalidAccessory.name}\" is not linked to cloud inventory yet. Refresh the page and try again.`);
      }

      const items=cart.map(i=>({
        product_id:i.kind==="product"?String(i.id):null,
        quantity:i.qty,
        imei:i.kind==="phone"?i.imei:null,
      }));

      const salePayload={
        p_receipt_no:receipt,p_customer_id:selectedCustomer?.id||null,p_cashier_id:user?.id||null,
        p_subtotal:total,p_discount:0,p_total:total,
        p_payment_method:paymentType === "Credit" ? "Credit" : payment,
        p_payment_reference:paymentReference.trim(),p_amount_paid:paid,
        p_payment_status:balance===0?"Paid":paid>0?"Partially Paid":"Unpaid",
        p_due_date:dueDate||null,p_items:items
      };
      if(!navigator.onLine){
        const queued=await queueOperation({type:"sale",payload:salePayload});
        if(!queued) throw new Error("Could not save the offline sale locally.");
        setPendingSync(n=>n+1);
        setLastSale({receiptNo:receipt,date:new Date(),items:cart.map(i=>({...i})),total,payment,paymentType,amountPaid:paid,balanceDue:balance,dueDate:dueDate||null,paymentReference:paymentReference.trim(),customer:selectedCustomer||null,offline:true});
        setCart([]);setPaymentReference("");setAmountPaid("");setDueDate("");setPaymentType("Full Payment");setSelectedCustomer(null);
        return;
      }

      const {data:sale,error}=await supabase.rpc("complete_sale",{
        p_receipt_no:receipt,
        p_customer_id:selectedCustomer?.id||null,
        p_cashier_id:user?.id||null,
        p_subtotal:total,
        p_discount:0,
        p_total:total,
        p_payment_method:paymentType === "Credit" ? "Credit" : payment,
        p_payment_reference:paymentReference.trim(),
        p_amount_paid:paid,
        p_payment_status:balance === 0 ? "Paid" : paid > 0 ? "Partially Paid" : "Unpaid",
        p_due_date:dueDate || null,
        p_items:items
      });

      if(error)throw error;

      setLastSale({
        receiptNo:sale?.receipt_no||receipt,
        date:new Date(),
        items:cart.map(i=>({...i})),
        total,
        payment,
        paymentType,
        amountPaid:paid,
        balanceDue:balance,
        dueDate:dueDate || null,
        paymentReference:paymentReference.trim(),
        customer:selectedCustomer||null
      });
      setCart([]);
      setPaymentReference("");
      setAmountPaid("");
      setDueDate("");
      setPaymentType("Full Payment");
      setSelectedCustomer(null);
      await Promise.all([loadProducts(),loadPhones(),loadCustomers()]);
    }catch(e){
      alert(`Sale could not be completed.
${e.message||e}`);
    }
  }

  async function syncOfflineQueue(){
    if(!navigator.onLine) return;
    const queue=await getQueue();
    for(const item of queue){
      try{
        if(item.type==="sale"){
          const {error}=await supabase.rpc("complete_sale",item.payload);
          if(error) throw error;
        }
        await removeQueued(item.id);
      }catch(error){ console.warn("Offline sync pending:",error); }
    }
    setPendingSync((await getQueue()).length);
    if((await getQueue()).length===0) await Promise.all([loadProducts(),loadPhones(),loadCustomers()]);
  }


  async function logout(){await supabase.auth.signOut();setCart([])}

  return <div className="app">
    <aside className={`sidebar ${mobileOpen?"open":""}`}>
      <div className="brand"><img src="/g-lokoo-logo.png" alt="G-LOKOO"/><div><strong>G-LOKOO</strong><span>PHONES & ACCESSORIES</span></div><button className="close" onClick={()=>setMobileOpen(false)}><X size={20}/></button></div>
      <div className="nav">{nav.filter(([,Icon,allowed])=>allowed).map(([name,Icon])=><button key={name} className={page===name?"active":""} onClick={()=>navigate(name)}><Icon size={19}/><span>{name}</span></button>)}</div>
      <div className="sidebar-footer"><button className="logout" onClick={logout}><LogOut size={15}/> Sign out</button>© AgendaSoft 2026 · G-LOKOO POS</div>
    </aside>

    <main className="main">
      <header className="topbar">
        <div className={`connection-status ${online?"online":"offline"}`} title={online?"Online":"Offline mode"}><span/> {online?"Online":"Offline"}{pendingSync>0&&<b> · {pendingSync} pending</b>}</div>
        <button className="menu" onClick={()=>setMobileOpen(true)}><Menu/></button>
        <div><h1>{page}</h1><p>G-LOKOO PHONES AND ACCESSORIES</p></div>
        <div className="top-actions"><button><Bell size={19}/></button><div className="user"><ShieldCheck size={14}/>{profile?.full_name||session.user.email}<small>{role}</small></div></div>
      </header>

      {page==="Dashboard"&&<Dashboard products={products} phones={phones} role={role} onNavigate={navigate}/>}
      {page==="New Sale"&&
        <POS
          products={filteredAccessories}
          phones={phones}
          query={query}
          setQuery={setQuery}
          phoneImei={phoneImei}
          setPhoneImei={setPhoneImei}
          lookupImei={lookupImei}
          cart={cart}
          addAccessory={addAccessory}
          addPhoneToCart={addPhoneToCart}
          changeQty={changeQty}
          total={total}
          payment={payment}
          setPayment={setPayment}
          paymentReference={paymentReference}
          setPaymentReference={setPaymentReference}
          paymentType={paymentType}
          setPaymentType={setPaymentType}
          amountPaid={amountPaid}
          setAmountPaid={setAmountPaid}
          dueDate={dueDate}
          setDueDate={setDueDate}
          checkout={checkout}
          customers={customers}
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
        />
      }
      {lastSale&&<Receipt sale={lastSale} settings={shopSettings} close={()=>setLastSale(null)}/>}
      {page==="Sales History"&&<SalesHistory customers={customers} settings={shopSettings}/>}
      {page==="Returns & Refunds"&&<Returns customers={customers}/>}
      {page==="Products & Inventory"&&<Products products={products} reload={loadProducts} canManage={canInventory}/>}
      {page==="Inventory Control"&&<InventoryControl products={products} phones={phones} settings={shopSettings} onNavigate={navigate}/>}
      {page==="Phones & IMEI"&&<Imei phones={phones} reload={loadPhones} canManage={canInventory}/>}
      {page==="Purchases"&&<Purchases products={products} reload={()=>{loadProducts();loadPhones();}}/>}
      {page==="Suppliers"&&<Suppliers role={role}/>}
      {page==="Customers"&&<Customers customers={customers} reload={loadCustomers} role={role}/>}
      {page==="Repairs"&&<Repairs customers={customers}/>}
      {page==="Expenses"&&<Expenses/>}
      {page==="Reports"&&<Reports/>}
      {page==="Staff"&&<Staff currentProfile={profile} reload={loadProfile}/>}
      {page==="Settings"&&<SettingsPage settings={shopSettings} reload={loadShopSettings}/>}
      {!["Dashboard","New Sale","Sales History","Products & Inventory","Phones & IMEI","Purchases","Suppliers","Customers","Repairs","Returns & Refunds","Inventory Control","Reports"].includes(page)&&<EmptyPage title={page}/>}
    <footer className="app-footer">© AgendaSoft 2026 · G-LOKOO POS</footer>
    </main>
  </div>
}

function Dashboard({products,phones,role,onNavigate}){
  const today=new Date();
  const iso=d=>d.toISOString().slice(0,10);
  const [range,setRange]=useState("today");
  const [from,setFrom]=useState(iso(new Date(today.getFullYear(),today.getMonth(),today.getDate())));
  const [to,setTo]=useState(iso(today));
  const [stats,setStats]=useState({
    sales:0,profit:0,collected:0,outstanding:0,saleCount:0,activeRepairs:0,
    returns:0,returnCount:0,repairRevenue:0,repairCollected:0,purchaseValue:0,supplierBalance:0,expenses:0,supplierPaid:0,netCash:0,trend:[],
    payments:[],bestSellers:[],cashiers:[],recentSales:[],owingCustomers:[],owingSuppliers:[],attentionRepairs:[],recentPurchases:[],comparison:{sales:0,profit:0,collected:0,outstanding:0,count:0}
  });
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState("");
  const isManagement=["owner","admin"].includes(role);

  function setQuickRange(key){
    const now=new Date();
    const end=iso(now);
    let start;
    if(key==="today") start=iso(new Date(now.getFullYear(),now.getMonth(),now.getDate()));
    if(key==="yesterday"){
      const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1);
      start=iso(d);
      setTo(start);
      setRange(key);
      setFrom(start);
      return;
    }
    if(key==="7d"){
      start=iso(new Date(now.getFullYear(),now.getMonth(),now.getDate()-6));
    }
    if(key==="30d"){
      start=iso(new Date(now.getFullYear(),now.getMonth(),now.getDate()-29));
    }
    if(key==="month") start=iso(new Date(now.getFullYear(),now.getMonth(),1));
    setRange(key); setFrom(start); setTo(end);
  }

  useEffect(()=>{loadDashboard();},[role,from,to]);

  async function loadDashboard(){
    setBusy(true); setError("");
    try{
      const fromDate=new Date(`${from}T00:00:00`);
      const toDate=new Date(`${to}T00:00:00`);
      const end=new Date(toDate); end.setDate(end.getDate()+1);
      const fromIso=fromDate.toISOString(), endIso=end.toISOString();

        const periodMs=end.getTime()-fromDate.getTime();
      const previousEnd=new Date(fromDate);
      const previousStart=new Date(fromDate.getTime()-periodMs);
      const previousStartIso=previousStart.toISOString();
      const previousEndIso=previousEnd.toISOString();
      const [{data:sales,error:salesError},{data:items,error:itemsError},{data:repairs,error:repairsError},{data:returns,error:returnsError},{data:purchases,error:purchasesError},{data:expenses,error:expensesError},{data:supplierBalances,error:supplierBalanceError},{data:supplierPayments,error:supplierPaymentsError},{data:customerBalances,error:customerBalanceError},{data:allRepairs,error:allRepairsError},{data:previousSales,error:previousSalesError},{data:previousItems,error:previousItemsError}]=await Promise.all([
        supabase.from("sales").select("id,receipt_no,total,amount_paid,balance_due,payment_method,cashier_id,created_at").gte("created_at",fromIso).lt("created_at",endIso),
        supabase.from("sales_profit_detail").select("sale_id,product_name,quantity,line_total,line_cost,line_profit,payment_method,created_at").gte("created_at",fromIso).lt("created_at",endIso),
        supabase.from("repairs").select("id,status,repair_cost,amount_paid,created_at").gte("created_at",fromIso).lt("created_at",endIso),
        supabase.from("sale_returns").select("refund_total,created_at").gte("created_at",fromIso).lt("created_at",endIso),
        supabase.from("purchases").select("id,purchase_no,supplier,total,created_at").gte("created_at",fromIso).lt("created_at",endIso),
        isManagement ? supabase.from("expenses").select("id,description,category,amount,expense_date,created_at").gte("created_at",fromIso).lt("created_at",endIso) : Promise.resolve({data:[],error:null}),
        isManagement ? supabase.from("supplier_balances").select("id,name,phone,email,balance,purchase_total,paid_total").order("balance",{ascending:false}) : Promise.resolve({data:[],error:null}),
        isManagement ? supabase.from("supplier_payments").select("id,supplier_id,amount,payment_method,reference,paid_at").gte("paid_at",fromIso).lt("paid_at",endIso) : Promise.resolve({data:[],error:null}),
        supabase.from("customer_balances").select("customer_id,name,phone,balance_due").gt("balance_due",0).order("balance_due",{ascending:false}),
        supabase.from("repairs").select("id,job_no,customer_id,device,fault,status,repair_cost,amount_paid,balance_due,created_at").not("status","in","(Collected,Cancelled)").order("created_at",{ascending:false}).limit(6),
        supabase.from("sales").select("id,total,amount_paid,balance_due,created_at").gte("created_at",previousStartIso).lt("created_at",previousEndIso),
        supabase.from("sales_profit_detail").select("sale_id,line_profit,created_at").gte("created_at",previousStartIso).lt("created_at",previousEndIso)
      ]);
      if(salesError) throw salesError;
      if(itemsError) throw itemsError;
      if(repairsError) throw repairsError;
      if(returnsError) throw returnsError;
      if(purchasesError) throw purchasesError;
      if(expensesError) throw expensesError;
      if(supplierBalanceError) throw supplierBalanceError;
      if(supplierPaymentsError) throw supplierPaymentsError;
      if(customerBalanceError) throw customerBalanceError;
      if(allRepairsError) throw allRepairsError;
      if(previousSalesError) throw previousSalesError;
      if(previousItemsError) throw previousItemsError;

      const salesRows=sales||[], itemRows=items||[], repairRows=repairs||[], returnRows=returns||[], purchaseRows=purchases||[], expenseRows=expenses||[], supplierRows=supplierBalances||[], supplierPaymentRows=supplierPayments||[], customerRows=customerBalances||[], attentionRepairs=allRepairs||[];
      const previousSalesRows=previousSales||[], previousItemRows=previousItems||[];
      const totalSales=salesRows.reduce((a,x)=>a+Number(x.total||0),0);
      const totalCollected=salesRows.reduce((a,x)=>a+Number(x.amount_paid||0),0);
      const grossProfit=itemRows.reduce((a,x)=>a+Number(x.line_profit||0),0);
      const returnTotal=returnRows.reduce((a,x)=>a+Number(x.refund_total||0),0);
      const adjustedProfit=grossProfit-returnTotal;
      const outstanding=salesRows.reduce((a,x)=>a+Number(x.balance_due||0),0);
      const repairRevenue=repairRows.reduce((a,x)=>a+Number(x.repair_cost||0),0);
      const repairCollected=repairRows.reduce((a,x)=>a+Number(x.amount_paid||0),0);
      const purchaseValue=purchaseRows.reduce((a,x)=>a+Number(x.total||0),0);
      const expenseTotal=expenseRows.reduce((a,x)=>a+Number(x.amount||0),0);
      const supplierPaid=supplierPaymentRows.reduce((a,x)=>a+Number(x.amount||0),0);
      const supplierBalance=supplierRows.reduce((a,x)=>a+Number(x.balance||0),0);
      const netCash=totalCollected+repairCollected-returnTotal-supplierPaid-expenseTotal;
      const recentSales=salesRows.slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,6);
      const recentPurchases=purchaseRows.slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,6);
      const previousSalesTotal=previousSalesRows.reduce((a,x)=>a+Number(x.total||0),0);
      const previousCollected=previousSalesRows.reduce((a,x)=>a+Number(x.amount_paid||0),0);
      const previousProfit=previousItemRows.reduce((a,x)=>a+Number(x.line_profit||0),0);
      const previousOutstanding=previousSalesRows.reduce((a,x)=>a+Number(x.balance_due||0),0);
      const comparison={sales:previousSalesTotal,profit:previousProfit,collected:previousCollected,outstanding:previousOutstanding,count:previousSalesRows.length};

      const days=[];
      for(let d=new Date(fromDate); d<=toDate && days.length<31; d.setDate(d.getDate()+1)){
        const day=new Date(d), next=new Date(day); next.setDate(day.getDate()+1);
        const daySales=salesRows.filter(x=>new Date(x.created_at)>=day && new Date(x.created_at)<next)
          .reduce((a,x)=>a+Number(x.total||0),0);
        const dayProfit=itemRows.filter(x=>new Date(x.created_at)>=day && new Date(x.created_at)<next)
          .reduce((a,x)=>a+Number(x.line_profit||0),0)
          - returnRows.filter(x=>new Date(x.created_at)>=day && new Date(x.created_at)<next)
          .reduce((a,x)=>a+Number(x.refund_total||0),0);
        days.push({label:day.toLocaleDateString("en-GH",{day:"2-digit",month:"short"}),sales:daySales,profit:dayProfit});
      }
      const trend=days.length>14 ? days.filter((_,i)=>i%Math.ceil(days.length/14)===0).slice(-14) : days;

      const paymentMap={};
      salesRows.forEach(x=>{const k=x.payment_method||"Other"; paymentMap[k]=(paymentMap[k]||0)+Number(x.amount_paid||0);});
      repairRows.forEach(x=>{ if(Number(x.amount_paid||0)>0){ const k="Repairs · Cash/Recorded"; paymentMap[k]=(paymentMap[k]||0)+Number(x.amount_paid||0); }});
      const payments=Object.entries(paymentMap).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value}));

      const bestMap={};
      itemRows.forEach(x=>{
        const k=x.product_name||"Unknown";
        if(!bestMap[k]) bestMap[k]={qty:0,revenue:0,profit:0};
        bestMap[k].qty+=Number(x.quantity||0);
        bestMap[k].revenue+=Number(x.line_total||0);
        bestMap[k].profit+=Number(x.line_profit||0);
      });
      const bestSellers=Object.entries(bestMap).sort((a,b)=>b[1].qty-a[1].qty).slice(0,6).map(([name,v])=>({name,...v}));

      let cashiers=[];
      if(isManagement && salesRows.length){
        const ids=[...new Set(salesRows.map(x=>x.cashier_id).filter(Boolean))];
        if(ids.length){
          const {data:profiles}=await supabase.from("profiles").select("id,full_name").in("id",ids);
          const names=Object.fromEntries((profiles||[]).map(p=>[p.id,p.full_name||"Cashier"]));
          const map={};
          salesRows.forEach(x=>{const k=names[x.cashier_id]||"Cashier"; map[k]=(map[k]||0)+Number(x.total||0);});
          cashiers=Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value}));
        }
      }
      setStats({
        sales:totalSales,
        profit:adjustedProfit,
        collected:totalCollected,
        outstanding,
        saleCount:salesRows.length,
        activeRepairs:attentionRepairs.length,
        returns:returnTotal,
        returnCount:returnRows.length,
        repairRevenue,
        repairCollected,
        purchaseValue,
        supplierBalance,
        expenses:expenseTotal,
        supplierPaid,
        netCash,
        trend,
        payments,
        bestSellers,
        cashiers,
        recentSales,
        owingCustomers:customerRows.slice(0,6),
        owingSuppliers:supplierRows.filter(x=>Number(x.balance||0)>0).slice(0,6),
        attentionRepairs,
        recentPurchases,
        comparison
      });
    }catch(e){
      console.error("Dashboard load failed",e);
      setError(e.message||"Could not load dashboard data.");
    }finally{setBusy(false);}
  }

  const accessoryStock=products.reduce((s,p)=>s+Number(p.stock||0),0);
  const lowStock=products.filter(p=>Number(p.stock||0)<=10).sort((a,b)=>Number(a.stock||0)-Number(b.stock||0)).slice(0,5);
  const phonesInStock=phones.filter(p=>p.status==="In Stock").length;
  const inventoryValue=products.reduce((s,p)=>s+Number(p.stock||0)*Number(p.cost||0),0)+phones.filter(p=>p.status==="In Stock").reduce((s,p)=>s+Number(p.cost||0),0);
  const margin=stats.sales>0 ? (stats.profit/stats.sales)*100 : 0;
  const maxTrend=Math.max(...stats.trend.map(x=>x.sales),1);
  const maxPayment=Math.max(...stats.payments.map(x=>x.value),1);
  const periodLabel=from===to ? new Date(`${from}T00:00:00`).toLocaleDateString("en-GH",{dateStyle:"medium"}) : `${new Date(`${from}T00:00:00`).toLocaleDateString("en-GH",{day:"2-digit",month:"short"})} – ${new Date(`${to}T00:00:00`).toLocaleDateString("en-GH",{day:"2-digit",month:"short",year:"numeric"})}`;

  const formatDate=d=>new Date(d).toLocaleDateString("en-GH",{day:"2-digit",month:"short"});
  const phoneInventoryValue=phones.filter(p=>p.status==="In Stock").reduce((s,p)=>s+Number(p.cost||0),0);
  const accessoryInventoryValue=products.reduce((s,p)=>s+Number(p.stock||0)*Number(p.cost||0),0);
  const pctChange=(current,previous)=>previous===0 ? (current===0?0:100) : ((current-previous)/previous)*100;
  const comparisonCards=[
    ["Sales",stats.sales,stats.comparison.sales,ShoppingCart],
    ["Profit",stats.profit,stats.comparison.profit,BarChart3],
    ["Collected",stats.collected,stats.comparison.collected,Banknote],
    ["Sales Count",stats.saleCount,stats.comparison.count,FileText]
  ];

  const quickActions=[
    ["New Sale",ShoppingCart,isManagement||role==="cashier"],
    ["Purchases",ReceiptText,isManagement||role==="inventory"],
    ["Repairs",Wrench,isManagement||role==="technician"],
    ["Expenses",Banknote,isManagement]
  ];

  return <section className="content dashboard-v2">
    <div className="welcome">
      <div><span className="eyebrow">SHOP OVERVIEW</span><h2>Good business starts with good visibility.</h2><p>Live sales, profit, stock and operations overview for G-LOKOO.</p></div>
      <button className="refresh-btn" onClick={loadDashboard} disabled={busy}><LoaderCircle size={16} className={busy?"spin":""}/> {busy?"Refreshing":"Refresh"}</button>
    </div>
    {error&&<div className="error dashboard-error">Dashboard data could not be fully loaded: {error}</div>}

    <div className="dashboard-filter-bar">
      <div className="quick-filters">
        {[
          ["today","Today"],["yesterday","Yesterday"],["7d","7 Days"],["30d","30 Days"],["month","This Month"]
        ].map(([key,label])=><button key={key} className={range===key?"active":""} onClick={()=>setQuickRange(key)}>{label}</button>)}
      </div>
      <div className="custom-dates">
        <label>From<input type="date" value={from} onChange={e=>{setRange("custom");setFrom(e.target.value)}}/></label>
        <span>to</span>
        <label>To<input type="date" value={to} onChange={e=>{setRange("custom");setTo(e.target.value)}}/></label>
        <strong>{periodLabel}</strong>
      </div>
    </div>

    <div className="dashboard-performance panel">
      <div className="panel-title"><div><h3>Performance vs Previous Period</h3><span>Compare the selected period with the immediately preceding period.</span></div><span>{periodLabel}</span></div>
      <div className="performance-grid">
        {comparisonCards.map(([label,current,previous,Icon])=>{const change=pctChange(Number(current||0),Number(previous||0));return <div className="performance-card" key={label}>
          <div className="performance-icon"><Icon size={17}/></div><div className="performance-main"><span>{label}</span><strong>{label==="Sales Count"?current:money(current)}</strong><small className={change>0?"up":change<0?"down":"flat"}>{change>0?"▲":change<0?"▼":"•"} {Math.abs(change).toFixed(1)}% vs previous</small></div>
        </div>})}
      </div>
    </div>

    <div className="stats">
      <Stat label="Sales" value={money(stats.sales)} icon={ShoppingCart}/>
      <Stat label="Gross Profit" value={money(stats.profit)} icon={BarChart3}/>
      <Stat label="Sales Collected" value={money(stats.collected)} icon={Banknote}/>
      <Stat label="Profit Margin" value={`${margin.toFixed(1)}%`} icon={BarChart3}/>
    </div>

    <div className="stats secondary-stats">
      <Stat label="Outstanding Credit" value={money(stats.outstanding)} icon={CreditCard}/>
      <Stat label="Phones In Stock" value={phonesInStock} icon={Smartphone}/>
      <Stat label="Accessory Units" value={accessoryStock} icon={Package}/>
      <Stat label="Inventory Cost Value" value={money(inventoryValue)} icon={Package}/>
    </div>

    <div className="stats secondary-stats">
      <Stat label="Repair Revenue" value={money(stats.repairRevenue)} icon={Wrench}/>
      <Stat label="Repair Collected" value={money(stats.repairCollected)} icon={Banknote}/>
      <Stat label="Returns & Refunds" value={money(stats.returns)} icon={Undo2}/>
      <Stat label="Active Repairs" value={stats.activeRepairs} icon={Wrench}/>
    </div>

    <div className="stats secondary-stats dashboard-finance-row">
      <Stat label="Purchases in Period" value={money(stats.purchaseValue)} icon={ReceiptText}/>
      {isManagement&&<Stat label="Supplier Balance" value={money(stats.supplierBalance)} icon={WalletCards}/>}
      <Stat label="Sales Count" value={stats.saleCount} icon={FileText}/>
      <Stat label="Return Count" value={stats.returnCount} icon={Undo2}/>
    </div>

    {isManagement&&<div className="stats secondary-stats dashboard-finance-row">
      <Stat label="Expenses" value={money(stats.expenses)} icon={Banknote}/>
      <Stat label="Supplier Payments" value={money(stats.supplierPaid)} icon={WalletCards}/>
      <Stat label="Net Cash Movement" value={money(stats.netCash)} icon={WalletCards}/>
      <Stat label="Business Profit" value={money(stats.profit+stats.repairRevenue-stats.expenses)} icon={BarChart3}/>
    </div>}


    <div className="dashboard-quick-actions">
      <div><span className="eyebrow">QUICK ACTIONS</span><h3>Run today's shop operations</h3></div>
      <div className="quick-action-buttons">{quickActions.filter(x=>x[2]).map(([name,Icon])=><button key={name} onClick={()=>onNavigate(name)}><Icon size={16}/>{name}</button>)}</div>
    </div>

    <div className="dashboard-grid-main">
      <div className="panel dashboard-panel">
        <div className="panel-title"><h3>Recent Sales</h3><span>Latest transactions</span></div>
        {stats.recentSales.length?stats.recentSales.map(x=><div className="metric-row" key={x.id}><div><b>{x.receipt_no||`Sale #${x.id}`}</b><small>{formatDate(x.created_at)} · {x.payment_method||"Other"}</small></div><strong>{money(x.total)}</strong></div>):<div className="empty">No recent sales.</div>}
      </div>
      <div className="panel dashboard-panel">
        <div className="panel-title"><h3>Repairs Needing Attention</h3><span>Open jobs</span></div>
        {stats.attentionRepairs.length?stats.attentionRepairs.map(x=><div className="metric-row" key={x.id}><div><b>{x.job_no||`Repair #${x.id}`}</b><small>{x.customer_id?`Customer #${x.customer_id}`:"Customer"} · {x.status}</small></div><strong>{money(Math.max(0,Number(x.repair_cost||0)-Number(x.amount_paid||0)))}</strong></div>):<div className="empty">No open repairs need attention.</div>}
      </div>
    </div>

    {isManagement&&<div className="dashboard-grid-main">
      <div className="panel dashboard-panel">
        <div className="panel-title"><h3>Customers Owing</h3><span>Outstanding balances</span></div>
        {stats.owingCustomers.length?stats.owingCustomers.map(x=><div className="metric-row" key={x.customer_id}><div><b>{x.name}</b><small>{x.phone||"No phone"}</small></div><strong>{money(x.balance_due)}</strong></div>):<div className="empty">No customers currently owing.</div>}
      </div>
      <div className="panel dashboard-panel">
        <div className="panel-title"><h3>Suppliers Owing</h3><span>Outstanding balances</span></div>
        {stats.owingSuppliers.length?stats.owingSuppliers.map(x=><div className="metric-row" key={x.id}><div><b>{x.name}</b><small>{x.phone||x.email||"Supplier"}</small></div><strong>{money(x.balance)}</strong></div>):<div className="empty">No supplier balances outstanding.</div>}
      </div>
    </div>}

    <div className="dashboard-grid-main">
      <div className="panel dashboard-panel">
        <div className="panel-title"><h3>Recent Purchases</h3><span>Latest stock received</span></div>
        {stats.recentPurchases.length?stats.recentPurchases.map(x=><div className="metric-row" key={x.id}><div><b>{x.purchase_no||`Purchase #${x.id}`}</b><small>{formatDate(x.created_at)} · {x.supplier||"No supplier"}</small></div><strong>{money(x.total)}</strong></div>):<div className="empty">No recent purchases.</div>}
      </div>
      <div className="panel dashboard-panel">
        <div className="panel-title"><h3>Financial Snapshot</h3><span>Selected period</span></div>
        <div className="inventory-health ops-health"><div><b>{money(stats.profit)}</b><span>Sales profit</span></div><div><b>{money(stats.repairRevenue)}</b><span>Repair revenue</span></div><div><b>{money(stats.expenses)}</b><span>Expenses</span></div><div><b>{money(stats.netCash)}</b><span>Net cash</span></div></div>
      </div>
    </div>

    <div className="dashboard-grid-main">
      <div className="panel dashboard-panel">
        <div className="panel-title"><h3>Sales vs Profit</h3><span>{periodLabel}</span></div>
        {stats.trend.length?<div className="trend-chart">
          {stats.trend.map((x,i)=>{
            const max=Math.max(maxTrend, ...stats.trend.map(t=>Math.max(t.profit,0)), 1);
            return <div className="trend-col" key={i}>
              <div className="trend-pair">
                <div className="trend-bar-wrap"><span>{x.sales?money(x.sales):"—"}</span><div className="trend-track"><div className="trend-bar sales-bar" style={{height:`${Math.max(4,x.sales/max*100)}%`}}/></div></div>
                <div className="trend-bar-wrap"><span>{x.profit?money(x.profit):"—"}</span><div className="trend-track"><div className="trend-bar profit-bar" style={{height:`${Math.max(4,Math.max(0,x.profit)/max*100)}%`}}/></div></div>
              </div>
              <small>{x.label}</small>
            </div>
          })}
        </div>:<div className="empty">No sales in this period.</div>}
        <div className="chart-legend"><span><i className="legend-sales"/>Sales</span><span><i className="legend-profit"/>Profit</span></div>
      </div>
      <div className="panel dashboard-panel">
        <div className="panel-title"><h3>Payment Methods</h3><span>Sales + Repairs</span></div>
        {stats.payments.length?stats.payments.map(x=><div className="metric-row" key={x.name}><div><b>{x.name}</b><small>{Math.round(x.value/maxPayment*100)}% of collected payments</small></div><strong>{money(x.value)}</strong></div>):<div className="empty">No payments recorded in this period.</div>}
      </div>
    </div>

    <div className="dashboard-grid-main">
      <div className="panel dashboard-panel">
        <div className="panel-title"><h3>Best Sellers</h3><span>Selected period</span></div>
        {stats.bestSellers.length?stats.bestSellers.map(x=><div className="metric-row" key={x.name}><div><b>{x.name}</b><small>{x.qty} unit{x.qty===1?"":"s"} · Profit {money(x.profit)}</small></div><strong>{money(x.revenue)}</strong></div>):<div className="empty">No sales in this period.</div>}
      </div>
      <div className="panel dashboard-panel">
        <div className="panel-title"><h3>Low Stock</h3><span>10 units or less</span></div>
        {lowStock.length?lowStock.map(p=><div className="stock-row" key={p.id}><div><b>{p.name}</b><small>{p.category||"Product"}</small></div><strong>{p.stock} left</strong></div>):<div className="empty">No low-stock products.</div>}
      </div>
    </div>

    <div className="dashboard-grid-main inventory-analytics">
      <div className="panel dashboard-panel">
        <div className="panel-title"><h3>Inventory Analytics</h3><span>Current stock</span></div>
        <div className="inventory-health">
          <div><b>{products.length}</b><span>Products</span></div>
          <div><b>{phonesInStock}</b><span>Phones in stock</span></div>
          <div><b>{accessoryStock}</b><span>Accessory units</span></div>
          <div><b>{lowStock.length}</b><span>Low-stock alerts</span></div>
        </div>
        <div className="inventory-value-row"><span>Inventory cost value</span><strong>{money(inventoryValue)}</strong></div>
        <div className="inventory-value-row"><span>Phone stock value</span><strong>{money(phoneInventoryValue)}</strong></div>
        <div className="inventory-value-row"><span>Accessory stock value</span><strong>{money(accessoryInventoryValue)}</strong></div>
      </div>
      <div className="panel dashboard-panel">
        <div className="panel-title"><h3>Stock by Category</h3><span>Units</span></div>
        {products.length?Object.entries(products.reduce((m,p)=>{const k=p.category||"Other";m[k]=(m[k]||0)+Number(p.stock||0);return m},{})).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,qty])=><div className="metric-row" key={name}><div><b>{name}</b><small>Current units</small></div><strong>{qty}</strong></div>):<div className="empty">No inventory data.</div>}
      </div>
    </div>

    {isManagement&&<div className="dashboard-grid-main">
      <div className="panel dashboard-panel">
        <div className="panel-title"><h3>Sales by Cashier</h3><span>{periodLabel}</span></div>
        {stats.cashiers.length?stats.cashiers.map(x=><div className="metric-row" key={x.name}><div><b>{x.name}</b><small>Sales value</small></div><strong>{money(x.value)}</strong></div>):<div className="empty">No cashier sales in this period.</div>}
      </div>
      <div className="panel dashboard-panel">
        <div className="panel-title"><h3>Returns & Refunds</h3><span>{periodLabel}</span></div>
        <div className="return-summary"><strong>{money(stats.returns)}</strong><span>{stats.returnCount} return{stats.returnCount===1?"":"s"} processed in this period</span></div>
      </div>
    </div>}
  </section>
}
function Stat({label,value,icon:Icon}){return <div className="stat"><div className="stat-icon"><Icon size={21}/></div><div><span>{label}</span><strong>{value}</strong></div></div>}

function POS({products,phones,query,setQuery,phoneImei,setPhoneImei,lookupImei,cart,addAccessory,addPhoneToCart,changeQty,total,payment,setPayment,paymentReference,setPaymentReference,paymentType,setPaymentType,amountPaid,setAmountPaid,dueDate,setDueDate,checkout,customers,selectedCustomer,setSelectedCustomer}){
  const [scannerOpen,setScannerOpen]=useState(false);
  const availablePhones=phones.filter(p=>p.status==="In Stock");
  const searchedPhones=phoneImei.trim()
    ? availablePhones.filter(p=>`${p.brand} ${p.model} ${p.imei_1} ${p.imei_2||""}`.toLowerCase().includes(phoneImei.toLowerCase()))
    : [];

  return <section className="content pos-page">
    <div className="pos-products">
      <div className="phone-lookup">
        <div className="phone-lookup-title"><div><b>Sell a Phone by IMEI</b><small>Scan or enter IMEI 1 / IMEI 2</small></div><ScanLine size={22}/></div>
        <form onSubmit={lookupImei} className="imei-search">
          <Search size={18}/>
          <input value={phoneImei} onChange={e=>setPhoneImei(e.target.value)} placeholder="Scan or type IMEI..."/>
          <button type="submit">Find Phone</button>
        </form>
        {searchedPhones.length>0&&<div className="imei-results">{searchedPhones.slice(0,5).map(p=>
          <button key={p.id} onClick={()=>addPhoneToCart(p)} className="imei-result">
            <div><b>{p.brand} {p.model}</b><small>{p.imei_1} {p.imei_2?`• ${p.imei_2}`:""} {p.storage?`• ${p.storage}`:""}</small></div>
            <strong>{money(p.selling_price)}</strong>
          </button>
        )}</div>}
      </div>

      <div className="barcode-search-row"><div className="searchbar"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();const code=e.currentTarget.value.trim().replace(/\s+/g,"");const exact=products.find(p=>String(p.barcode||"").trim()===code||String(p.sku||"").trim()===code);if(exact){addAccessory(exact);setQuery("")}else if(code){alert(`No product found for barcode/SKU: ${code}`)}}}} placeholder="Search or scan barcode / SKU..."/></div><button type="button" className="primary pos-scan-btn" aria-label="Scan Barcode" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.preventDefault();e.stopPropagation();setScannerOpen(true)}}><ScanLine size={17}/> Scan Barcode</button></div>
      <div className="category-row"><button className="selected">Accessories</button></div>
      <div className="product-grid">
        {products.map(p=><button className="product-card" key={p.id} onClick={()=>addAccessory(p)}>
          <div className="product-image"><Package size={38}/></div>
          <div className="product-name">{p.name}</div>
          {p.barcode&&<div className="product-barcode">{p.barcode}</div>}
          <div className="product-meta"><b>{money(p.price)}</b><span>{p.stock} in stock</span></div>
        </button>)}
        {!products.length&&<div className="empty">No accessories found.</div>}
      </div>
    </div>

    <div className="cart-panel">
      <div className="cart-head"><h3>Current Sale</h3><span>{cart.reduce((s,i)=>s+i.qty,0)} items</span></div>
      <div className="customer-checkout">
        <label>Customer <span>Optional</span>
          <select value={selectedCustomer?.id||""} onChange={e=>setSelectedCustomer(customers.find(c=>String(c.id)===String(e.target.value))||null)}>
            <option value="">Walk-in customer</option>
            {customers.map(c=><option key={c.id} value={c.id}>{c.name}{c.phone?` — ${c.phone}`:""}</option>)}
          </select>
        </label>
      </div>
      <div className="cart-lines">
        {!cart.length?<div className="empty">Cart is empty<br/><small>Select an accessory or add a phone by IMEI.</small></div>:
        cart.map(i=><div className="cart-line" key={i.id}>
          <div className="line-info">
            <b>{i.name}</b>
            {i.kind==="phone"
              ? <small className="mono">IMEI: {i.imei}{i.meta?` • ${i.meta}`:""}</small>
              : <small>{money(i.price)} each</small>}
          </div>
          {i.kind==="phone"
            ? <span className="imei-sold-chip">1 unit</span>
            : <div className="qty"><button onClick={()=>changeQty(i.id,-1)}><Minus size={14}/></button><span>{i.qty}</span><button onClick={()=>changeQty(i.id,1)}><Plus size={14}/></button></div>}
          <strong>{money(i.price*i.qty)}</strong>
        </div>)}
      </div>

      <div className="checkout">
        <div className="total-row"><span>Subtotal</span><b>{money(total)}</b></div>
        <div className="grand"><span>Total</span><strong>{money(total)}</strong></div>
        <div className="payment-type-row">
          {["Full Payment","Part Payment","Credit"].map(x=><button key={x} className={paymentType===x?"pay-type selected":"pay-type"} onClick={()=>setPaymentType(x)}>{x}</button>)}
        </div>
        {paymentType !== "Credit" && <>
          <div className="payment-grid">
            {["Cash","MTN MoMo","Telecel Cash","AirtelTigo Money","Bank Transfer","Card"].map(x=><button key={x} className={payment===x?"pay selected":"pay"} onClick={()=>setPayment(x)}>
              {x==="Cash"?<Banknote/>:<CreditCard/>}<span>{x}</span>
            </button>)}
          </div>
          {paymentType === "Part Payment" && <label className="payment-ref">Amount paid (GHS)
            <input type="number" min="0" max={total} step="0.01" value={amountPaid} onChange={e=>setAmountPaid(e.target.value)} placeholder={`e.g. ${Math.round(total/2)}`}/>
          </label>}
          {(payment==="MTN MoMo"||payment==="Telecel Cash"||payment==="AirtelTigo Money"||payment==="Bank Transfer")&&
            <label className="payment-ref">Transaction reference
              <input value={paymentReference} onChange={e=>setPaymentReference(e.target.value)} placeholder="e.g. MP240915123456"/>
            </label>}
        </>}
        {paymentType !== "Full Payment" && <label className="payment-ref">Payment due date
          <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} min={new Date().toISOString().slice(0,10)}/>
        </label>}
        {paymentType !== "Full Payment" && <div className="balance-box"><span>Paid now</span><b>{money(paymentType === "Credit" ? 0 : Number(amountPaid||0))}</b><span>Balance due</span><strong>{money(Math.max(0,total-(paymentType === "Credit" ? 0 : Number(amountPaid||0))))}</strong></div>}
        <button className="checkout-btn" disabled={!cart.length} onClick={checkout}>
          <CheckCircle2 size={17}/> COMPLETE SALE · {money(total)}
        </button>
      </div>
    </div>
    {scannerOpen&&<BarcodeScanner title="Scan Product Barcode" onClose={()=>setScannerOpen(false)} onDetected={value=>{const code=String(value||"").trim().replace(/\s+/g,"");const exact=products.find(p=>String(p.barcode||"").trim()===code||String(p.sku||"").trim()===code);setScannerOpen(false);if(exact){addAccessory(exact);setQuery("")}else if(code){alert(`No product found for barcode/SKU: ${code}`)}}}/>}
  </section>
}

function printReceiptWindow(sale,settings){
  const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const date=sale.date instanceof Date?sale.date:new Date(sale.date);
  const dateText=date.toLocaleString("en-GH",{dateStyle:"medium",timeStyle:"short"});
  const receiptWidth=(settings?.receipt_width||"80mm")==="58mm"?"58mm":"80mm";
  // Until a thermal printer is configured, use a normal-paper/PDF layout so
  // Chrome does not render the 58/80mm receipt as a tiny strip on Letter paper.
  // Once a printer name is entered in Settings, the receipt switches back to
  // true thermal width automatically.
  const thermalMode=Boolean(String(settings?.printer_name||"").trim());
  const printWidth=thermalMode?receiptWidth:"100%";
  const pageSize=thermalMode?`${receiptWidth} auto`:"auto";
  const sidePad=thermalMode?(receiptWidth==="58mm"?"3mm":"4mm"):"12mm";
  const items=(sale.items||[]).map(i=>`<div class="item"><div class="item-left"><b>${esc(i.name)}</b>${i.kind==="phone"?`<small>IMEI: ${esc(i.imei)}</small>`:`<small>${esc(i.qty)} × ${money(i.price)}</small>`}</div><strong>${money(i.price*i.qty)}</strong></div>`).join("");
  const payment=sale.paymentType==="Credit"?"Credit":(sale.payment||"");
  const extra=sale.paymentType==="Part Payment"?`<div class="row"><span>Paid now</span><b>${money(sale.amountPaid)}</b></div><div class="row"><span>Balance due</span><b>${money(sale.balanceDue)}</b></div>${sale.dueDate?`<div class="row"><span>Due date</span><b>${esc(new Date(`${sale.dueDate}T00:00:00`).toLocaleDateString("en-GH"))}</b></div>`:``}`:sale.paymentType==="Credit"?`<div class="row"><span>Paid now</span><b>₵0.00</b></div><div class="row"><span>Balance due</span><b>${money(sale.balanceDue)}</b></div>${sale.dueDate?`<div class="row"><span>Due date</span><b>${esc(new Date(`${sale.dueDate}T00:00:00`).toLocaleDateString("en-GH"))}</b></div>`:``}`:"";
  const ref=sale.paymentReference?`<div class="row"><span>Reference</span><b>${esc(sale.paymentReference)}</b></div>`:"";
  const shopName=esc(settings?.shop_name||"G-LOKOO PHONES AND ACCESSORIES");
  const phone1=esc(settings?.phone_primary||"0247917685");
  const phone2=esc(settings?.phone_secondary||"050006067");
  const footer=esc(settings?.receipt_footer||"Thank you for shopping with G-LOKOO!");
  const note=esc(settings?.receipt_note||"Please keep this receipt for your records.");
  const w=window.open("","_blank","width=420,height=800");
  if(!w){alert("Please allow pop-ups for this POS so receipts can be printed.");return;}
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${shopName} Receipt ${esc(sale.receiptNo)}</title><style>
    @page{size:${pageSize};margin:0}
    *{box-sizing:border-box}
    html,body{margin:0!important;padding:0!important;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif;width:${printWidth};max-width:${printWidth};overflow-x:hidden}
    body{font-size:${thermalMode?"10px":"18px"}}
    .receipt{width:${printWidth};max-width:${printWidth};margin:0 auto;padding:${sidePad} ${sidePad} 8mm;font-size:${thermalMode?"10px":"18px"};overflow:hidden}
    .brand{text-align:center;width:100%}
    .brand img{display:block;width:${thermalMode?"18mm":"35mm"};height:${thermalMode?"18mm":"35mm"};object-fit:contain;margin:0 auto 1mm}
    .brand h1{font-size:${thermalMode?"17px":"34px"};line-height:1.05;letter-spacing:1.2px;margin:1mm 0;font-weight:800}
    .brand p{font-size:${thermalMode?"8px":"15px"};line-height:1.2;letter-spacing:.45px;margin:1mm 0;color:#333}
    .rule{border-top:1px dashed #777;margin:3mm 0}
    .row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.35fr);align-items:start;column-gap:3mm;margin:${thermalMode?"1.8mm":"3mm"} 0;width:100%}
    .row span{color:#555;min-width:0;overflow-wrap:anywhere}
    .row b{min-width:0;text-align:right;overflow-wrap:anywhere;word-break:break-word;font-weight:700}
    .item{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;column-gap:3mm;margin:${thermalMode?"2.5mm":"4mm"} 0;width:100%}
    .item-left{min-width:0;overflow:hidden}
    .item b{display:block;overflow-wrap:anywhere;word-break:break-word;font-weight:700}
    .item small{display:block;font-size:${thermalMode?"8px":"13px"};color:#555;font-family:monospace;margin-top:1mm;overflow-wrap:anywhere;word-break:break-word}
    .item strong{white-space:nowrap;text-align:right;font-weight:800}
    .total{display:flex;justify-content:space-between;align-items:center;gap:3mm;font-size:${thermalMode?"14px":"26px"};font-weight:800;margin:3mm 0;width:100%}
    .total span,.total strong{white-space:nowrap}
    .thanks{text-align:center;border-top:1px solid #ddd;padding-top:3mm;margin-top:4mm;width:100%}
    .thanks b,.thanks span{display:block;overflow-wrap:anywhere}
    .thanks b{font-size:${thermalMode?"8.5px":"13px"};line-height:1.25}
    .thanks span{font-size:${thermalMode?"7.5px":"11px"};color:#666;margin-top:1mm;line-height:1.25}
    @media print{
      html,body{width:${printWidth}!important;max-width:${printWidth}!important;margin:0!important;padding:0!important;overflow-x:hidden!important}
      .receipt{width:${printWidth}!important;max-width:${printWidth}!important;margin:0 auto!important;padding:${sidePad} ${sidePad} 12mm!important;page-break-after:avoid;page-break-before:avoid;overflow:hidden!important}
    }
  </style></head><body><main class="receipt"><div class="brand"><img src="${location.origin}/g-lokoo-logo.png"><h1>G-LOKOO</h1><p>PHONES AND ACCESSORIES</p><p>${phone1} · ${phone2}</p></div><div class="rule"></div><div class="row"><span>Receipt</span><b>${esc(sale.receiptNo)}</b></div><div class="row"><span>Date</span><b>${esc(dateText)}</b></div><div class="row"><span>Customer</span><b>${esc(sale.customer?.name||"Walk-in customer")}</b></div>${sale.customer?.phone?`<div class="row"><span>Phone</span><b>${esc(sale.customer.phone)}</b></div>`:""}<div class="rule"></div>${items}<div class="rule"></div><div class="total"><span>TOTAL</span><strong>${money(sale.total)}</strong></div><div class="row"><span>Payment</span><b>${esc(payment)}</b></div>${extra}${ref}<div class="thanks"><b>${footer}</b><span>${note}</span></div></main><script>window.onload=function(){setTimeout(function(){window.print();setTimeout(function(){window.close()},300)},350)};<\/script></body></html>`);
  w.document.close();
}

function Receipt({sale,settings,close}){
  const date=sale.date instanceof Date?sale.date:new Date(sale.date);
  const dateText=date.toLocaleString("en-GH",{dateStyle:"medium",timeStyle:"short"});
  return <div className="modal-bg receipt-overlay">
    <div className="receipt-modal">
      <div className="receipt-actions no-print">
        <div><h3>Sale Completed</h3><p>Receipt {sale.receiptNo}</p></div>
        <button className="modal-close" onClick={close}><X size={18}/></button>
      </div>
      <div className="receipt-paper print-receipt">
        <div className="receipt-brand">
          <img src="/g-lokoo-logo.png" alt="G-LOKOO"/>
          <h1>G-LOKOO</h1>
          <p>PHONES AND ACCESSORIES</p>
          <p>0247917685 · 050006067</p>
        </div>
        <div className="receipt-rule"/>
        <div className="receipt-info"><span>Receipt</span><b>{sale.receiptNo}</b></div>
        <div className="receipt-info"><span>Date</span><b>{dateText}</b></div>
        <div className="receipt-info"><span>Customer</span><b>{sale.customer?.name||"Walk-in customer"}</b></div>
        {sale.customer?.phone&&<div className="receipt-info"><span>Phone</span><b>{sale.customer.phone}</b></div>}
        <div className="receipt-rule"/>
        <div className="receipt-items">
          {sale.items.map((i,n)=><div className="receipt-item" key={`${i.id}-${n}`}>
            <div><b>{i.name}</b>{i.kind==="phone"?<small>IMEI: {i.imei}</small>:<small>{i.qty} × {money(i.price)}</small>}</div>
            <strong>{money(i.price*i.qty)}</strong>
          </div>)}
        </div>
        <div className="receipt-rule"/>
        <div className="receipt-total"><span>TOTAL</span><strong>{money(sale.total)}</strong></div>
        <div className="receipt-info"><span>Payment</span><b>{sale.paymentType === "Credit" ? "Credit" : sale.payment}</b></div>
        {sale.paymentType === "Part Payment" && <>
          <div className="receipt-info"><span>Paid now</span><b>{money(sale.amountPaid)}</b></div>
          <div className="receipt-info"><span>Balance due</span><b>{money(sale.balanceDue)}</b></div>
          {sale.dueDate&&<div className="receipt-info"><span>Due date</span><b>{new Date(`${sale.dueDate}T00:00:00`).toLocaleDateString("en-GH")}</b></div>}
        </>}
        {sale.paymentType === "Credit" && <>
          <div className="receipt-info"><span>Paid now</span><b>₵0.00</b></div>
          <div className="receipt-info"><span>Balance due</span><b>{money(sale.balanceDue)}</b></div>
          {sale.dueDate&&<div className="receipt-info"><span>Due date</span><b>{new Date(`${sale.dueDate}T00:00:00`).toLocaleDateString("en-GH")}</b></div>}
        </>}
        {sale.paymentReference&&<div className="receipt-info"><span>Reference</span><b>{sale.paymentReference}</b></div>}
        <div className="receipt-thanks">
          <b>Thank you for shopping with G-LOKOO!</b>
          <span>Please keep this receipt for your records.</span>
        </div>
      </div>
      <div className="receipt-buttons no-print">
        <button className="secondary" onClick={close}>Close</button>
        <button className="primary" onClick={()=>printReceiptWindow(sale,settings)}><ReceiptText size={16}/> Print Receipt</button>
      </div>
    </div>
  </div>
}

function SalesHistory({customers,settings}){
  const today=new Date();
  const iso=d=>d.toISOString().slice(0,10);
  const [from,setFrom]=useState(iso(new Date(today.getFullYear(),today.getMonth(),1)));
  const [to,setTo]=useState(iso(today));
  const [search,setSearch]=useState("");
  const [status,setStatus]=useState("All");
  const [sales,setSales]=useState([]);
  const [loading,setLoading]=useState(true);
  const [view,setView]=useState(null);
  const [receipt,setReceipt]=useState(null);

  async function load(){
    setLoading(true);
    const end=new Date(`${to}T00:00:00`); end.setDate(end.getDate()+1);
    const salesRes=await supabase.from("sales")
      .select("id,receipt_no,customer_id,total,amount_paid,balance_due,payment_method,payment_status,due_date,created_at")
      .gte("created_at",`${from}T00:00:00`).lt("created_at",end.toISOString()).order("created_at",{ascending:false});
    if(salesRes.error){alert(salesRes.error.message);setSales([]);setLoading(false);return;}
    const rows=salesRes.data||[];
    const ids=rows.map(x=>x.id);
    let itemRows=[];
    if(ids.length){
      const itemsRes=await supabase.from("sale_items").select("id,sale_id,product_name,quantity,unit_price,line_total,imei").in("sale_id",ids).order("id");
      if(itemsRes.error){alert(itemsRes.error.message);setLoading(false);return;}
      itemRows=itemsRes.data||[];
    }
    const by=new Map();
    itemRows.forEach(i=>{const a=by.get(i.sale_id)||[];a.push(i);by.set(i.sale_id,a)});
    setSales(rows.map(r=>({...r,items:by.get(r.id)||[]})));
    setLoading(false);
  }
  useEffect(()=>{load()},[from,to]);

  const customerMap=new Map((customers||[]).map(c=>[c.id,c]));
  const filtered=sales.filter(s=>{
    const c=customerMap.get(s.customer_id);
    const text=`${s.receipt_no||""} ${c?.name||""} ${c?.phone||""} ${(s.items||[]).map(i=>`${i.product_name} ${i.imei||""}`).join(" ")}`.toLowerCase();
    const q=search.trim().toLowerCase();
    const matches=!q||text.includes(q);
    const matchesStatus=status==="All" || (status==="Paid" ? Number(s.balance_due||0)<=0 : Number(s.balance_due||0)>0);
    return matches&&matchesStatus;
  });

  const total=filtered.reduce((a,s)=>a+Number(s.total||0),0);
  const collected=filtered.reduce((a,s)=>a+Number(s.amount_paid||0),0);
  const outstanding=filtered.reduce((a,s)=>a+Number(s.balance_due||0),0);

  function receiptFor(s){
    const c=customerMap.get(s.customer_id);
    return {
      receiptNo:s.receipt_no,
      date:new Date(s.created_at),
      customer:c||null,
      items:(s.items||[]).map(i=>({id:i.id,kind:i.imei?"phone":"product",name:i.product_name,qty:Number(i.quantity||1),price:Number(i.unit_price||0),imei:i.imei})),
      total:Number(s.total||0),
      paymentType:Number(s.balance_due||0)>0?(Number(s.amount_paid||0)>0?"Part Payment":"Credit"):"Full Payment",
      payment:s.payment_method,
      amountPaid:Number(s.amount_paid||0),
      balanceDue:Number(s.balance_due||0),
      dueDate:s.due_date,
    };
  }

  return <section className="content">
    <div className="section-head"><div><h2>Sales History</h2><p>Search completed sales, review items and reprint receipts.</p></div><button className="secondary" onClick={load}><ReceiptText size={16}/> Refresh</button></div>
    <div className="history-toolbar">
      <div className="searchbar"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search receipt, customer, phone or IMEI..."/></div>
      <label>From<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
      <label>To<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
      <label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option>All</option><option>Paid</option><option>Outstanding</option></select></label>
    </div>
    <div className="stats report-stats history-stats">
      <Stat label="Sales shown" value={money(total)} icon={ShoppingCart}/>
      <Stat label="Collected" value={money(collected)} icon={Banknote}/>
      <Stat label="Outstanding" value={money(outstanding)} icon={CreditCard}/>
      <Stat label="Transactions" value={String(filtered.length)} icon={ReceiptText}/>
    </div>
    <div className="table-panel"><table><thead><tr><th>Receipt</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Action</th></tr></thead><tbody>
      {loading?<tr><td colSpan="8" className="empty">Loading sales history...</td></tr>:filtered.map(s=>{
        const c=customerMap.get(s.customer_id); const outstanding=Number(s.balance_due||0)>0;
        return <tr key={s.id}>
          <td><b>{s.receipt_no}</b><small>Sale #{s.id}</small></td>
          <td>{new Date(s.created_at).toLocaleString("en-GH",{dateStyle:"medium",timeStyle:"short"})}</td>
          <td><b>{c?.name||"Walk-in customer"}</b><small>{c?.phone||"No phone"}</small></td>
          <td>{(s.items||[]).length}<small>{(s.items||[]).slice(0,2).map(i=>i.product_name).join(", ")}{(s.items||[]).length>2?"…":""}</small></td>
          <td><b>{money(s.total)}</b></td>
          <td>{s.payment_method||"Cash"}<small>Paid {money(s.amount_paid||0)}</small></td>
          <td><span className={`badge ${outstanding?"warn":"ok"}`}>{outstanding?`Balance ${money(s.balance_due)}`:"Paid"}</span></td>
          <td><button className="table-action" onClick={()=>setView(s)}>View / Receipt</button></td>
        </tr>
      })}
      {!loading&&!filtered.length&&<tr><td colSpan="8" className="empty">No sales found for the selected filters.</td></tr>}
    </tbody></table></div>
    {view&&<Modal title={`Sale ${view.receipt_no}`} close={()=>setView(null)}>
      <div className="sale-detail">
        <div className="sale-detail-top"><div><b>{customerMap.get(view.customer_id)?.name||"Walk-in customer"}</b><small>{new Date(view.created_at).toLocaleString("en-GH",{dateStyle:"medium",timeStyle:"short"})}</small></div><strong>{money(view.total)}</strong></div>
        {(view.items||[]).map(i=><div className="history-item" key={i.id}><span><b>{i.product_name}</b>{i.imei?<small>IMEI: {i.imei}</small>:<small>{i.quantity} × {money(i.unit_price)}</small>}</span><strong>{money(i.line_total)}</strong></div>)}
        <div className="history-payment">Payment: {view.payment_method||"Cash"} · {view.payment_status||"Paid"}{Number(view.balance_due||0)>0&&` · Balance ${money(view.balance_due)}`}</div>
      </div>
      <button className="primary full" onClick={()=>setReceipt(receiptFor(view))}><ReceiptText size={16}/> Open Printable Receipt</button>
      <button className="secondary full" onClick={()=>{setView(null);setTimeout(()=>{},0);}}>Close</button>
    </Modal>}
    {receipt&&<Receipt sale={receipt} settings={settings} close={()=>setReceipt(null)}/>}
  </section>
}

function Returns({customers=[]}){
  const [query,setQuery]=useState("");
  const [sale,setSale]=useState(null);
  const [items,setItems]=useState([]);
  const [selected,setSelected]=useState({});
  const [refundMethod,setRefundMethod]=useState("Cash");
  const [refundReference,setRefundReference]=useState("");
  const [reason,setReason]=useState("");
  const [busy,setBusy]=useState(false);
  const [history,setHistory]=useState([]);

  const customerMap=new Map((customers||[]).map(c=>[c.id,c]));
  async function findSale(){
    const q=query.trim();
    if(!q) return alert("Enter a receipt number or sale ID.");
    setSale(null); setItems([]); setSelected({});
    let res;
    if(/^\d+$/.test(q)) res=await supabase.from("sales").select("*").eq("id",Number(q)).maybeSingle();
    else res=await supabase.from("sales").select("*").eq("receipt_no",q).maybeSingle();
    if(res.error) return alert(res.error.message);
    if(!res.data) return alert("Sale not found.");
    const ir=await supabase.from("sale_items").select("id,sale_id,product_id,product_name,imei,quantity,unit_price,line_total").eq("sale_id",res.data.id).order("id");
    if(ir.error) return alert(ir.error.message);
    const rr=await supabase.from("sale_return_items").select("sale_item_id,quantity").in("sale_item_id",(ir.data||[]).map(x=>x.id));
    if(rr.error) return alert(rr.error.message);
    const returned=new Map(); (rr.data||[]).forEach(x=>returned.set(x.sale_item_id,(returned.get(x.sale_item_id)||0)+Number(x.quantity||0)));
    setSale(res.data); setItems((ir.data||[]).map(i=>({...i,returnedQty:returned.get(i.id)||0,availableQty:Math.max(0,Number(i.quantity)-Number(returned.get(i.id)||0))})));
  }
  const selectedRows=items.filter(i=>Number(selected[i.id]||0)>0);
  const refundTotal=selectedRows.reduce((a,i)=>a+Number(selected[i.id])*Number(i.unit_price||0),0);
  async function submit(){
    if(!sale||!selectedRows.length) return alert("Select at least one item to return.");
    if(refundTotal>Number(sale.amount_paid||0)) return alert(`Refund cannot exceed the amount already paid (${money(sale.amount_paid)}).`);
    if(["MTN MoMo","Telecel Cash","AirtelTigo Money","Bank Transfer"].includes(refundMethod)&&!refundReference.trim()) return alert("Enter the refund transaction reference.");
    setBusy(true);
    const {data:{user}}=await supabase.auth.getUser();
    const {error}=await supabase.rpc("process_sale_return",{p_sale_id:sale.id,p_items:selectedRows.map(i=>({sale_item_id:i.id,quantity:Number(selected[i.id])})),p_refund_method:refundMethod,p_refund_reference:refundReference.trim(),p_reason:reason.trim(),p_created_by:user?.id||null});
    setBusy(false);
    if(error) return alert(error.message);
    alert(`Return completed. Refund: ${money(refundTotal)}`);
    setQuery(""); setSale(null); setItems([]); setSelected({}); setRefundReference(""); setReason(""); loadHistory();
  }
  async function loadHistory(){
    const {data,error}=await supabase.from("sale_returns").select("id,sale_id,refund_total,cash_refund,credit_reversal,refund_method,refund_reference,reason,created_at").order("created_at",{ascending:false}).limit(20);
    if(!error) setHistory(data||[]);
  }
  useEffect(()=>{loadHistory()},[]);
  return <section className="content">
    <div className="section-head"><div><h2>Returns & Refunds</h2><p>Process partial or full returns for completed sales and restore stock.</p></div><button className="secondary" onClick={loadHistory}><History size={16}/> Refresh</button></div>
    <div className="panel return-search"><div className="panel-title"><h3>Find a Sale</h3><span>Owner/Admin only</span></div><div className="searchbar"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&findSale()} placeholder="Receipt number or sale ID..."/><button className="primary" onClick={findSale}>Find Sale</button></div></div>
    {sale&&<div className="panel return-sale"><div className="sale-detail-top"><div><b>{sale.receipt_no}</b><small>{new Date(sale.created_at).toLocaleString("en-GH",{dateStyle:"medium",timeStyle:"short"})} · {customerMap.get(sale.customer_id)?.name||"Walk-in customer"}</small></div><strong>{money(sale.total)}</strong></div>
      <div className="return-items">{items.map(i=>{const qty=Number(selected[i.id]||0);return <div className="return-item" key={i.id}><div><b>{i.product_name}</b>{i.imei?<small>IMEI: {i.imei}</small>:<small>{i.quantity} sold · {i.availableQty} returnable</small>}</div><div><strong>{money(i.unit_price)}</strong><input type="number" min="0" max={i.availableQty} value={qty} onChange={e=>{const v=Math.min(i.availableQty,Math.max(0,Number(e.target.value||0)));setSelected({...selected,[i.id]:v})}} disabled={!i.availableQty}/></div></div>})}</div>
      <div className="form-grid-2"><label>Refund method<select value={refundMethod} onChange={e=>setRefundMethod(e.target.value)}>{["Cash","MTN MoMo","Telecel Cash","AirtelTigo Money","Bank Transfer","Card"].map(x=><option key={x}>{x}</option>)}</select></label><label>Refund reference<input value={refundReference} onChange={e=>setRefundReference(e.target.value)} placeholder="Required for electronic refund"/></label></div>
      <label>Reason<input value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Customer changed mind, faulty accessory"/></label>
      <div className="return-total"><span>Refund total</span><strong>{money(refundTotal)}</strong></div>
      <button className="primary full" disabled={busy||!selectedRows.length} onClick={submit}>{busy?<><LoaderCircle size={16} className="spin"/> Processing...</>:<><Undo2 size={16}/> Complete Return & Refund</>}</button>
    </div>}
    <div className="panel"><div className="panel-title"><h3>Recent Returns</h3><span>Last 20</span></div><div className="table-panel inner-table"><table><thead><tr><th>Return</th><th>Sale</th><th>Refund</th><th>Method</th><th>Reason</th><th>Date</th></tr></thead><tbody>{history.map(r=><tr key={r.id}><td><b>RET-{String(r.id).padStart(5,"0")}</b></td><td>#{r.sale_id}</td><td><b>{money(r.refund_total)}</b></td><td>{r.refund_method}{r.refund_reference&&<small>{r.refund_reference}</small>}</td><td>{r.reason||"—"}</td><td>{new Date(r.created_at).toLocaleString("en-GH",{dateStyle:"medium",timeStyle:"short"})}</td></tr>)}{!history.length&&<tr><td colSpan="6" className="empty">No returns recorded yet.</td></tr>}</tbody></table></div></div>
  </section>
}

function InventoryControl({products,phones,settings,onNavigate}){
  const [movements,setMovements]=useState([]),[loading,setLoading]=useState(true),[from,setFrom]=useState(""),[to,setTo]=useState(""),[search,setSearch]=useState(""),[reason,setReason]=useState("All");
  const [phoneMoves,setPhoneMoves]=useState([]),[phoneLoading,setPhoneLoading]=useState(true);
  const lowThreshold=Number(settings?.low_stock_threshold ?? 10);
  const accessoryUnits=products.reduce((s,p)=>s+Number(p.stock||0),0);
  const phonesInStock=phones.filter(p=>p.status==="In Stock").length;
  const inventoryValue=products.reduce((s,p)=>s+Number(p.stock||0)*Number(p.cost||0),0)+phones.filter(p=>p.status==="In Stock").reduce((s,p)=>s+Number(p.cost||0),0);
  const lowStock=products.filter(p=>Number(p.stock||0)<=lowThreshold).sort((a,b)=>Number(a.stock||0)-Number(b.stock||0));

  async function load(){
    setLoading(true);setPhoneLoading(true);
    let q=supabase.from("inventory_movement_summary").select("*").order("created_at",{ascending:false}).limit(200);
    if(from)q=q.gte("created_at",`${from}T00:00:00`);
    if(to){ const end=new Date(`${to}T00:00:00`); end.setDate(end.getDate()+1); q=q.lt("created_at",end.toISOString()); }
    const r=await q;
    setMovements(r.error?[]:(r.data||[]));setLoading(false);
    const pr=await supabase.from("phone_stock_movements").select("id,phone_unit_id,from_status,to_status,reason,sale_id,created_at,phone_units(brand,model,imei_1,imei_2)").order("created_at",{ascending:false}).limit(100);
    setPhoneMoves(pr.error?[]:(pr.data||[]));setPhoneLoading(false);
  }
  useEffect(()=>{load()},[from,to]);
  const filtered=movements.filter(m=>{
    const text=`${m.product_name||""} ${m.category||""} ${m.reason||""} ${m.note||""}`.toLowerCase();
    return (!search||text.includes(search.toLowerCase()))&&(reason==="All"||m.reason===reason);
  });
  const reasons=["All",...Array.from(new Set(movements.map(m=>m.reason).filter(Boolean)))];
  function csv(){
    const rows=[["Date","Product","Category","Change","Before","After","Reason","Note"],...filtered.map(m=>[new Date(m.created_at).toISOString(),m.product_name,m.category||"",m.change_qty,m.stock_before,m.stock_after,m.reason,m.note||""])];
    const esc=v=>`"${String(v??"").replace(/"/g,'""')}"`;
    const blob=new Blob([rows.map(r=>r.map(esc).join(",")).join("\n")],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`g-lokoo-inventory-movements-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(a.href);
  }
  return <section className="content">
    <div className="section-head"><div><h2>Inventory Control</h2><p>Monitor stock value, low-stock alerts and auditable inventory movement history.</p></div><div className="section-actions"><button className="secondary" onClick={csv}><Download size={16}/> Export CSV</button><button className="primary" onClick={load}><History size={16}/> Refresh</button></div></div>
    <div className="inventory-control-stats"><Stat label="Accessory Units" value={accessoryUnits} icon={Package}/><Stat label="Phones In Stock" value={phonesInStock} icon={Smartphone}/><Stat label="Inventory Cost Value" value={money(inventoryValue)} icon={WalletCards}/><Stat label="Low-Stock Items" value={lowStock.length} icon={AlertTriangle}/></div>
    <div className="grid2 inventory-control-grid">
      <div className="panel"><div className="panel-title"><h3>Low Stock Alerts</h3><span>{lowStock.length} item(s) · threshold {lowThreshold}</span></div>{lowStock.length?lowStock.slice(0,12).map(p=><div className="inventory-alert-row" key={p.id}><div><b>{p.name}</b><small>{p.category||"Product"} · cost {money(p.cost)}</small></div><strong>{p.stock} left</strong></div>):<div className="empty">No low-stock items.</div>}<button className="secondary full" onClick={()=>onNavigate("Products & Inventory")}><Package size={15}/> Open Products & Inventory</button></div>
      <div className="panel"><div className="panel-title"><h3>Stock Health</h3><span>Current inventory</span></div><div className="inventory-health inventory-health-large"><div><b>{products.length}</b><span>Products</span></div><div><b>{accessoryUnits}</b><span>Accessory units</span></div><div><b>{phonesInStock}</b><span>Phone units</span></div><div><b>{lowStock.filter(p=>Number(p.stock)===0).length}</b><span>Out of stock</span></div></div><div className="inventory-value-row"><span>Accessory cost value</span><strong>{money(products.reduce((s,p)=>s+Number(p.stock||0)*Number(p.cost||0),0))}</strong></div><div className="inventory-value-row"><span>Phone cost value</span><strong>{money(phones.filter(p=>p.status==="In Stock").reduce((s,p)=>s+Number(p.cost||0),0))}</strong></div><div className="inventory-value-row"><span>Total cost value</span><strong>{money(inventoryValue)}</strong></div></div>
    </div>
    <div className="panel inventory-movement-panel"><div className="panel-title"><div><h3>Accessory Stock Movement</h3><span>Manual adjustments recorded in the inventory ledger.</span></div><span>{filtered.length} movement(s)</span></div>
      <div className="inventory-control-filters"><div className="searchbar"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search product, category, reason..."/></div><label>From<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>To<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><label>Reason<select value={reason} onChange={e=>setReason(e.target.value)}>{reasons.map(r=><option key={r}>{r}</option>)}</select></label></div>
      <div className="table-panel inventory-control-table"><table><thead><tr><th>Date</th><th>Product</th><th>Change</th><th>Before</th><th>After</th><th>Reason</th><th>Note</th></tr></thead><tbody>{loading?<tr><td colSpan="7" className="empty">Loading movements...</td></tr>:filtered.length?filtered.map(m=><tr key={m.id}><td>{new Date(m.created_at).toLocaleString("en-GH",{dateStyle:"medium",timeStyle:"short"})}</td><td><b>{m.product_name}</b><small>{m.category||""}</small></td><td><b className={Number(m.change_qty)>=0?"balance-clear":"balance-due"}>{Number(m.change_qty)>=0?"+":""}{m.change_qty}</b></td><td>{m.stock_before}</td><td><b>{m.stock_after}</b></td><td>{m.reason}</td><td>{m.note||"—"}</td></tr>):<tr><td colSpan="7" className="empty">No stock movements found.</td></tr>}</tbody></table></div>
    </div>
    <div className="panel inventory-movement-panel"><div className="panel-title"><div><h3>Phone Stock History</h3><span>IMEI unit status events recorded after the v2.18 migration.</span></div><span>{phoneMoves.length} event(s)</span></div><div className="table-panel inventory-control-table"><table><thead><tr><th>Date</th><th>Phone / IMEI</th><th>From</th><th>To</th><th>Reason</th><th>Sale</th></tr></thead><tbody>{phoneLoading?<tr><td colSpan="6" className="empty">Loading phone history...</td></tr>:phoneMoves.length?phoneMoves.map(m=><tr key={m.id}><td>{new Date(m.created_at).toLocaleString("en-GH",{dateStyle:"medium",timeStyle:"short"})}</td><td><b>{m.phone_units?.brand||"Phone"} {m.phone_units?.model||""}</b><small className="mono">{m.phone_units?.imei_1||""}</small></td><td>{m.from_status||"New"}</td><td><span className="badge ok">{m.to_status}</span></td><td>{m.reason}</td><td>{m.sale_id||"—"}</td></tr>):<tr><td colSpan="6" className="empty">No phone movement history yet.</td></tr>}</tbody></table></div></div>
  </section>
}

function Products({products,reload,canManage=true}){
  const [open,setOpen]=useState(false),[editing,setEditing]=useState(null),[historyOpen,setHistoryOpen]=useState(null);
  const [name,setName]=useState(""),[price,setPrice]=useState(""),[cost,setCost]=useState(""),[stock,setStock]=useState(""),[category,setCategory]=useState("Accessories"),[barcode,setBarcode]=useState("");
  const [adjustOpen,setAdjustOpen]=useState(null),[adjustQty,setAdjustQty]=useState(""),[adjustType,setAdjustType]=useState("increase"),[adjustReason,setAdjustReason]=useState("Stock correction"),[adjustNote,setAdjustNote]=useState(""),[busy,setBusy]=useState(false);
  const [movements,setMovements]=useState([]),[movementLoading,setMovementLoading]=useState(false),[search,setSearch]=useState(""),[scannerOpen,setScannerOpen]=useState(false);

  function resetForm(){setName("");setPrice("");setCost("");setStock("");setCategory("Accessories");setBarcode("");setEditing(null)}
  async function save(){
    if(!name.trim()){alert("Product name is required.");return}
    const cleanBarcode=barcode.trim().replace(/\s+/g,"");
    const payload={name:name.trim(),category,price:Number(price||0),cost:Number(cost||0),stock:Number(stock||0),barcode:cleanBarcode||null};
    if(payload.price<0||payload.cost<0||payload.stock<0){alert("Price, cost and stock cannot be negative.");return}
    setBusy(true);
    const q=editing?supabase.from("products").update(payload).eq("id",editing.id):supabase.from("products").insert(payload);
    const {error}=await q;
    setBusy(false);
    if(error)alert(error.message);else{setOpen(false);resetForm();reload()}
  }
  async function openHistory(p){
    setHistoryOpen(p);setMovementLoading(true);setMovements([]);
    const {data,error}=await supabase.from("stock_movements").select("id,change_qty,stock_before,stock_after,reason,note,created_at,created_by").eq("product_id",p.id).order("created_at",{ascending:false}).limit(50);
    if(error)alert(error.message);else setMovements(data||[]);
    setMovementLoading(false);
  }
  async function adjustStock(){
    const qty=Math.floor(Number(adjustQty));
    if(!adjustOpen||!Number.isFinite(qty)||qty<=0){alert("Enter a whole-number quantity greater than 0.");return}
    if(!adjustReason.trim()){alert("Select a reason for the stock adjustment.");return}
    const change=adjustType==="increase"?qty:-qty;
    setBusy(true);
    try{
      const {data:{user}}=await supabase.auth.getUser();
      const {data,error}=await supabase.rpc("adjust_product_stock",{p_product_id:Number(adjustOpen.id),p_change_qty:change,p_reason:adjustReason,p_note:adjustNote.trim()||null,p_user_id:user?.id||null});
      if(error)throw error;
      alert(`${adjustOpen.name} stock adjusted successfully.\nNew stock: ${Number(data?.stock_after ?? 0)}`);
      setAdjustOpen(null);setAdjustQty("");setAdjustType("increase");setAdjustReason("Stock correction");setAdjustNote("");
      await reload();
      if(historyOpen?.id===adjustOpen.id)openHistory({...adjustOpen,stock:Number(data?.stock_after??adjustOpen.stock)});
    }catch(e){alert(e.message||String(e))}
    finally{setBusy(false)}
  }
  const filtered=products.filter(p=>`${p.name} ${p.category||""} ${p.sku||""} ${p.barcode||""}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="content">
    <div className="section-head"><div><h2>Products & Inventory</h2><p>{canManage?"Manage products, stock levels and inventory adjustments in Supabase.":"View-only inventory access for Cashier accounts."}</p></div>{canManage&&<button className="primary" onClick={()=>{resetForm();setOpen(true)}}><Plus size={17}/> Add Product</button>}</div>
    <div className="inventory-toolbar panel"><div className="searchbar"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search product or category..."/></div><span className="field-hint">Stock adjustments are recorded with a reason and audit history.</span></div>
    <div className="table-panel"><table><thead><tr><th>Product</th><th>Category</th><th>Barcode</th><th>Sell Price</th><th>Cost</th><th>Stock</th><th>Status</th><th>Action</th></tr></thead><tbody>
      {filtered.map(p=><tr key={p.id}><td><b>{p.name}</b></td><td>{p.category}</td><td className="mono">{p.barcode||"—"}</td><td>{money(p.price)}</td><td>{money(p.cost)}</td><td><b>{p.stock}</b></td><td><span className={`badge ${Number(p.stock)<=10?"warn":"ok"}`}>{Number(p.stock)<=10?"Low Stock":"In Stock"}</span></td><td><div className="table-actions"><button className="table-action" onClick={()=>openHistory(p)}><ClipboardList size={13}/> History</button>{canManage&&<><button className="table-action" onClick={()=>{setAdjustOpen(p);setAdjustQty("");setAdjustType("increase");setAdjustReason("Stock correction");setAdjustNote("")}}><ArrowUpDown size={13}/> Adjust</button><button className="table-action" onClick={()=>{setEditing(p);setName(p.name||"");setPrice(p.price??"");setCost(p.cost??"");setStock(p.stock??"");setCategory(p.category||"Accessories");setBarcode(p.barcode||"");setOpen(true)}}><Pencil size={13}/> Edit</button></>}</div></td></tr>)}
      {!filtered.length&&<tr><td colSpan="8" className="empty">No products found.</td></tr>}
    </tbody></table></div>
    {open&&<Modal title={editing?"Edit Product":"Add Product"} close={()=>!busy&&setOpen(false)}>
      <label>Product name<input value={name} onChange={e=>setName(e.target.value)}/></label>
      <label>Category<select value={category} onChange={e=>setCategory(e.target.value)}><option>Accessories</option><option>Phones</option><option>SIM Cards</option><option>Chargers</option><option>Cases</option><option>Audio</option><option>Other</option></select></label>
      <label>Barcode<div className="barcode-input-row"><input value={barcode} onChange={e=>setBarcode(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")e.preventDefault()}} placeholder="Scan or enter barcode..." inputMode="numeric"/><button type="button" className="table-action barcode-scan-btn" onClick={()=>setScannerOpen(true)}><ScanLine size={14}/> Scan</button></div><small className="field-hint">USB/Bluetooth scanners work like a keyboard. Camera scanning is also available.</small></label>
      <div className="form-grid-2"><label>Selling price (GHS)<input type="number" min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)}/></label><label>Cost price (GHS)<input type="number" min="0" step="0.01" value={cost} onChange={e=>setCost(e.target.value)}/></label></div>
      <label>{editing?"Current stock":"Opening stock"}<input type="number" min="0" step="1" value={stock} onChange={e=>setStock(e.target.value)}/>{editing&&<small className="field-hint">For traceable stock changes, use Adjust instead of editing stock.</small>}</label>
      <button className="primary full" disabled={busy} onClick={save}>{busy?<><LoaderCircle size={16} className="spin"/> Saving...</>:editing?"Save Changes":"Save Product"}</button>
    </Modal>}
    {scannerOpen&&<BarcodeScanner onClose={()=>setScannerOpen(false)} onDetected={value=>{setBarcode(value);setScannerOpen(false)}}/>}
    {adjustOpen&&<Modal title={`Adjust Stock · ${adjustOpen.name}`} close={()=>!busy&&setAdjustOpen(null)}>
      <div className="balance-box"><span>Current stock</span><strong>{adjustOpen.stock}</strong></div>
      <div className="form-grid-2"><label>Adjustment<select value={adjustType} onChange={e=>setAdjustType(e.target.value)}><option value="increase">Increase stock (+)</option><option value="decrease">Decrease stock (−)</option></select></label><label>Quantity<input type="number" min="1" step="1" value={adjustQty} onChange={e=>setAdjustQty(e.target.value)} placeholder="0"/></label></div>
      <label>Reason<select value={adjustReason} onChange={e=>setAdjustReason(e.target.value)}><option>Stock correction</option><option>Damaged</option><option>Lost</option><option>Found</option><option>Internal use</option><option>Opening balance</option><option>Physical count</option><option>Other</option></select></label>
      <label>Note<textarea value={adjustNote} onChange={e=>setAdjustNote(e.target.value)} placeholder="Optional explanation..."/></label>
      <button className="primary full" disabled={busy} onClick={adjustStock}>{busy?<><LoaderCircle size={16} className="spin"/> Updating...</>:"Confirm Stock Adjustment"}</button>
    </Modal>}
    {historyOpen&&<Modal title={`Stock History · ${historyOpen.name}`} close={()=>setHistoryOpen(null)}>
      <div className="balance-box"><span>Current stock</span><strong>{historyOpen.stock}</strong></div>
      <div className="table-panel inventory-history-table"><table><thead><tr><th>Date</th><th>Change</th><th>Before</th><th>After</th><th>Reason</th><th>Note</th></tr></thead><tbody>{movementLoading?<tr><td colSpan="6" className="empty">Loading stock history...</td></tr>:movements.length?movements.map(m=><tr key={m.id}><td>{new Date(m.created_at).toLocaleString("en-GH",{dateStyle:"medium",timeStyle:"short"})}</td><td><b className={Number(m.change_qty)>=0?"balance-clear":"balance-due"}>{Number(m.change_qty)>=0?"+":""}{m.change_qty}</b></td><td>{m.stock_before}</td><td><b>{m.stock_after}</b></td><td>{m.reason}</td><td>{m.note||"—"}</td></tr>):<tr><td colSpan="6" className="empty">No manual stock adjustments recorded.</td></tr>}</tbody></table></div>
    </Modal>}
  </section>
}
function Imei({phones,reload,canManage=true}){
  const [search,setSearch]=useState("");
  const [status,setStatus]=useState("All");
  const filtered=phones.filter(p=>{
    const q=search.toLowerCase();
    const text=[p.brand,p.model,p.imei_1,p.imei_2,p.storage,p.ram,p.color].filter(Boolean).join(" ").toLowerCase();
    return (!q||text.includes(q))&&(status==="All"||p.status===status);
  });
  return <section className="content">
    <div className="section-head"><div><h2>Phones & IMEI</h2><p>{canManage?"Each physical phone is tracked individually.":"View-only phone and IMEI access for Cashier accounts."}</p></div><button className="primary" onClick={reload}>Refresh</button></div>
    <div className="panel" style={{marginBottom:18}}>
      <div className="searchbar"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search phone, model or IMEI..."/></div>
      <div className="category-row"><button className={status==="All"?"selected":""} onClick={()=>setStatus("All")}>All</button><button className={status==="In Stock"?"selected":""} onClick={()=>setStatus("In Stock")}>In Stock</button><button className={status==="Sold"?"selected":""} onClick={()=>setStatus("Sold")}>Sold</button><button className={status==="Reserved"?"selected":""} onClick={()=>setStatus("Reserved")}>Reserved</button><button className={status==="Returned"?"selected":""} onClick={()=>setStatus("Returned")}>Returned</button></div>
    </div>
    <div className="table-panel"><table><thead><tr><th>Phone</th><th>IMEI 1</th><th>IMEI 2</th><th>Cost</th><th>Selling</th><th>Status</th></tr></thead><tbody>
      {filtered.map(p=><tr key={p.id}><td><b>{p.brand} {p.model}</b><small>{[p.storage,p.ram,p.color].filter(Boolean).join(" • ")}</small></td><td className="mono">{p.imei_1}</td><td className="mono">{p.imei_2||"—"}</td><td>{money(p.cost)}</td><td>{money(p.selling_price)}</td><td><span className={`badge ${p.status==="In Stock"?"ok":"warn"}`}>{p.status}</span></td></tr>)}
      {!filtered.length&&<tr><td colSpan="6" className="empty">No phone units found.</td></tr>}
    </tbody></table></div>
  </section>
}

function Purchases({products,reload}){
  const [open,setOpen]=useState(false);
  const [supplier,setSupplier]=useState("");
  const [supplierId,setSupplierId]=useState("");
  const [invoice,setInvoice]=useState("");
  const [date,setDate]=useState(new Date().toISOString().slice(0,10));
  const [initialPayment,setInitialPayment]=useState("0");
  const [paymentMethod,setPaymentMethod]=useState("Cash");
  const [paymentRef,setPaymentRef]=useState("");
  const [tab,setTab]=useState("accessory");
  const [busy,setBusy]=useState(false);
  const [accessory,setAccessory]=useState({product_id:"",quantity:"1",unit_cost:""});
  const [phone,setPhone]=useState({brand:"",model:"",storage:"",ram:"",color:"",condition:"New",imei_1:"",imei_2:"",cost:"",selling_price:"",warranty:""});
  const [items,setItems]=useState([]);
  const [history,setHistory]=useState([]);
  const [loadingHistory,setLoadingHistory]=useState(true);
  const [suppliers,setSuppliers]=useState([]);
  const [search,setSearch]=useState("");
  const [filterSupplier,setFilterSupplier]=useState("");
  const [dateFrom,setDateFrom]=useState("");
  const [dateTo,setDateTo]=useState("");
  const [detail,setDetail]=useState(null);
  const [detailLoading,setDetailLoading]=useState(false);
  const [detailItems,setDetailItems]=useState([]);
  const [detailPayments,setDetailPayments]=useState([]);

  async function loadSuppliers(){const {data,error}=await supabase.from("suppliers").select("id,name,phone").order("name");if(!error)setSuppliers(data||[]);}

  async function loadHistory(){
    setLoadingHistory(true);
    const {data,error}=await supabase.from("purchases").select("id,purchase_no,supplier,supplier_id,invoice_no,purchase_date,total,created_at").order("purchase_date",{ascending:false}).order("created_at",{ascending:false}).limit(200);
    if(!error){
      const rows=data||[];
      const ids=rows.map(x=>x.id);
      if(ids.length){
        const {data:lines}=await supabase.from("purchase_items").select("purchase_id,item_type,quantity").in("purchase_id",ids);
        const by=new Map();
        (lines||[]).forEach(line=>{
          const cur=by.get(line.purchase_id)||{item_count:0,phone_units:0,accessory_units:0};
          cur.item_count+=1;
          if(line.item_type==="phone")cur.phone_units+=Number(line.quantity||1);
          else cur.accessory_units+=Number(line.quantity||0);
          by.set(line.purchase_id,cur);
        });
        setHistory(rows.map(row=>({...row,...(by.get(row.id)||{item_count:0,phone_units:0,accessory_units:0})})));
      }else setHistory([]);
    } else alert(error.message);
    setLoadingHistory(false);
  }
  useEffect(()=>{loadHistory();loadSuppliers()},[]);

  const filteredHistory=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return history.filter(p=>{
      const matchesSearch=!q||[p.purchase_no,p.invoice_no,p.supplier].some(v=>String(v||"").toLowerCase().includes(q));
      const matchesSupplier=!filterSupplier||String(p.supplier_id||"")===String(filterSupplier);
      const matchesFrom=!dateFrom||String(p.purchase_date)>=dateFrom;
      const matchesTo=!dateTo||String(p.purchase_date)<=dateTo;
      return matchesSearch&&matchesSupplier&&matchesFrom&&matchesTo;
    });
  },[history,search,filterSupplier,dateFrom,dateTo]);

  const historyTotals=useMemo(()=>filteredHistory.reduce((a,p)=>{a.total+=Number(p.total||0);a.lines+=Number(p.item_count||0);a.phones+=Number(p.phone_units||0);a.accessories+=Number(p.accessory_units||0);return a},{total:0,lines:0,phones:0,accessories:0}),[filteredHistory]);

  function reset(){
    setSupplier("");setSupplierId("");setInvoice("");setDate(new Date().toISOString().slice(0,10));setInitialPayment("0");setPaymentMethod("Cash");setPaymentRef("");setTab("accessory");setItems([]);
    setAccessory({product_id:"",quantity:"1",unit_cost:""});
    setPhone({brand:"",model:"",storage:"",ram:"",color:"",condition:"New",imei_1:"",imei_2:"",cost:"",selling_price:"",warranty:""});
  }
  function addAccessory(){
    const p=products.find(x=>String(x.id)===String(accessory.product_id));
    const qty=Number(accessory.quantity||0), cost=Number(accessory.unit_cost||0);
    if(!p||qty<1||cost<0){alert("Select an accessory, quantity and cost price.");return;}
    setItems(x=>[...x,{type:"accessory",product_id:p.id,product_name:p.name,quantity:Math.floor(qty),unit_cost:cost}]);
    setAccessory({product_id:"",quantity:"1",unit_cost:""});
  }
  function addPhone(){
    const required=[phone.brand,phone.model,phone.imei_1,phone.cost,phone.selling_price];
    if(required.some(x=>!String(x).trim())){alert("Brand, model, IMEI 1, cost and selling price are required.");return;}
    setItems(x=>[...x,{type:"phone",...phone,cost:Number(phone.cost),selling_price:Number(phone.selling_price),product_name:`${phone.brand} ${phone.model}`,quantity:1,unit_cost:Number(phone.cost)}]);
    setPhone({brand:"",model:"",storage:"",ram:"",color:"",condition:"New",imei_1:"",imei_2:"",cost:"",selling_price:"",warranty:""});
  }
  const total=items.reduce((s,i)=>s+(i.type==="phone"?Number(i.cost):Number(i.unit_cost)*Number(i.quantity)),0);

  async function receive(){
    if(!supplierId){alert("Select a supplier before receiving the purchase.");return;}
    if(!items.length){alert("Add at least one item to the purchase.");return;}
    const paid=Number(initialPayment||0);
    if(!Number.isFinite(paid)||paid<0||paid>total){alert(`Initial payment must be between ₵0.00 and ${money(total)}.`);return;}
    if(paid>0 && ["MTN MoMo","Telecel Cash","AirtelTigo Money","Bank Transfer","Card"].includes(paymentMethod) && !paymentRef.trim()){alert("Enter the transaction reference for this electronic payment.");return;}
    setBusy(true);
    try{
      const {data:{user}}=await supabase.auth.getUser();
      const {data,error}=await supabase.rpc("receive_purchase_v3",{p_supplier_id:Number(supplierId),p_invoice_no:invoice.trim()||null,p_purchase_date:date,p_received_by:user?.id||null,p_total:total,p_initial_payment:paid,p_payment_method:paymentMethod,p_payment_reference:paymentRef.trim()||null,p_items:items});
      if(error)throw error;
      alert(`Purchase ${data?.purchase_no||"received"} successfully.\nTotal: ${money(total)}\nPaid now: ${money(paid)}\nSupplier balance: ${money(total-paid)}`);
      setOpen(false);reset();await Promise.all([reload(),loadHistory()]);
    }catch(e){alert(`Purchase could not be received.\n${e.message||e}`)}
    finally{setBusy(false)}
  }

  async function openDetail(p){
    setDetail(p);setDetailLoading(true);setDetailItems([]);setDetailPayments([]);
    const [itemsRes,payRes]=await Promise.all([
      supabase.from("purchase_items").select("*").eq("purchase_id",p.id).order("id"),
      p.supplier_id ? supabase.from("supplier_payments").select("id,amount,payment_method,reference,paid_at").eq("supplier_id",p.supplier_id).order("paid_at",{ascending:true}) : Promise.resolve({data:[],error:null})
    ]);
    if(itemsRes.error){alert(itemsRes.error.message);setDetailLoading(false);return}
    setDetailItems(itemsRes.data||[]);
    if(!payRes.error)setDetailPayments(payRes.data||[]);
    setDetailLoading(false);
  }

  function printPurchase(){
    if(!detail)return;

    const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
    const itemRows=detailItems.map(i=>`<tr><td><b>${esc(i.product_name||"—")}</b>${i.brand||i.model?`<small>${esc([i.brand,i.model].filter(Boolean).join(" "))}</small>`:""}</td><td>${esc(i.item_type||"—")}</td><td class="mono">${esc(i.imei_1||"—")}</td><td class="num">${Number(i.quantity||1)}</td><td class="num">${money(i.unit_cost)}</td><td class="num"><b>${money(Number(i.unit_cost||0)*Number(i.quantity||1))}</b></td></tr>`).join("");
    const payRows=detailPayments.map(x=>`<tr><td>${esc(new Date(x.paid_at).toLocaleDateString("en-GH"))}</td><td>${esc(x.payment_method||"Cash")}</td><td>${esc(x.reference||"—")}</td><td class="num"><b>${money(x.amount)}</b></td></tr>`).join("");

    // IMPORTANT: create a completely separate HTML document and navigate the
    // popup to it. Do not inject print markup into the SPA and do not call
    // window.print() from the parent page. This prevents Chrome from printing
    // the POS shell as a blank page.
    const w=window.open("about:blank","_blank","width=900,height=900");
    if(!w){alert("Please allow pop-ups for this POS to print the purchase record.");return;}

    const logoUrl=new URL("/g-lokoo-logo.png",window.location.href).href;
    const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Purchase ${esc(detail.purchase_no||"")}</title>
      <style>
        @page{size:A4 portrait;margin:10mm}
        *{box-sizing:border-box}
        html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif}
        body{font-size:10px}
        .sheet{width:100%;max-width:190mm;margin:0 auto;padding:2mm}
        .brand{text-align:center;margin-bottom:5mm}
        .brand img{display:block;width:22mm;height:22mm;object-fit:contain;margin:0 auto 2mm}
        .brand h1{font-size:18px;margin:2mm 0 1mm;letter-spacing:.5px}
        .brand p{font-size:10px;margin:0;color:#555}
        .rule{border-top:1px dashed #888;margin:4mm 0}
        .meta{display:grid;grid-template-columns:1fr 1fr;gap:3mm 8mm;margin-bottom:5mm}
        .meta span{display:block;font-size:8px;color:#777;margin-bottom:1mm}
        .meta b{display:block;font-size:10px}
        h2{font-size:11px;margin:5mm 0 2mm}
        table{width:100%;border-collapse:collapse;margin:0 0 4mm}
        th,td{border-bottom:1px solid #ddd;padding:2.5mm 2mm;font-size:8.5px;text-align:left;vertical-align:top}
        th{background:#f4f4f4;font-size:7.5px;text-transform:uppercase}
        .num{text-align:right}
        td small{display:block;color:#777;font-size:7px;margin-top:1mm}
        .mono{font-family:monospace;font-size:7.5px}
        .total{display:flex;justify-content:space-between;border-top:2px solid #111;padding-top:3mm;margin-top:4mm;font-size:13px}
        .total strong{font-size:15px}
        .footer{text-align:center;border-top:1px solid #ddd;margin-top:8mm;padding-top:4mm;font-size:8px;color:#777;line-height:1.5}
        @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
      </style></head><body>
      <main class="sheet">
        <div class="brand"><img src="${esc(logoUrl)}" alt="G-LOKOO"><h1>G-LOKOO PHONES AND ACCESSORIES</h1><p>Purchase Record</p></div>
        <div class="rule"></div>
        <div class="meta"><div><span>Purchase No.</span><b>${esc(detail.purchase_no)}</b></div><div><span>Supplier</span><b>${esc(detail.supplier||"—")}</b></div><div><span>Purchase Date</span><b>${esc(detail.purchase_date||"—")}</b></div><div><span>Invoice No.</span><b>${esc(detail.invoice_no||"—")}</b></div></div>
        <h2>Purchased Items</h2>
        <table><thead><tr><th>Product</th><th>Type</th><th>IMEI</th><th class="num">Qty</th><th class="num">Unit Cost</th><th class="num">Total</th></tr></thead><tbody>${itemRows||'<tr><td colspan="6">No items found.</td></tr>'}</tbody></table>
        <h2>Supplier Payments</h2>
        <table><thead><tr><th>Date</th><th>Method</th><th>Reference</th><th class="num">Amount</th></tr></thead><tbody>${payRows||'<tr><td colspan="4">No supplier payments recorded.</td></tr>'}</tbody></table>
        <div class="total"><span>Purchase Total</span><strong>${money(detail.total)}</strong></div>
        <div class="footer">G-LOKOO PHONES AND ACCESSORIES<br>Purchase record generated from G-LOKOO POS</div>
      </main>
    </body></html>`;

    const blob=new Blob([html],{type:"text/html;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    w.location.replace(url);

    // Print only after the standalone document has loaded. The popup owns the
    // print call, so Chrome cannot fall back to the parent POS page.
    let done=false;
    const trigger=()=>{
      if(done)return;
      done=true;
      setTimeout(()=>{try{w.focus();w.print();}catch(e){}},200);
      setTimeout(()=>URL.revokeObjectURL(url),10000);
    };
    w.addEventListener("load",trigger);
    setTimeout(trigger,2500);
  }

  function exportCSV(){
    const rows=[["Purchase No","Supplier","Invoice No","Purchase Date","Item Lines","Phone Units","Accessory Units","Total"]];
    filteredHistory.forEach(p=>rows.push([p.purchase_no||"",p.supplier||"",p.invoice_no||"",p.purchase_date||"",p.item_count||0,p.phone_units||0,p.accessory_units||0,Number(p.total||0).toFixed(2)]));
    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`g-lokoo-purchases-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
  }

  return <section className="content">
    <div className="section-head"><div><h2>Purchases / Stock In</h2><p>Receive stock and manage your complete purchase history.</p></div><div className="section-actions"><button className="secondary" onClick={exportCSV} disabled={!filteredHistory.length}><Download size={15}/> Export CSV</button><button className="primary" onClick={()=>{reset();setOpen(true)}}><Plus size={17}/> New Purchase</button></div></div>
    <div className="stats purchase-stats">
      <Stat label="Purchases Shown" value={filteredHistory.length} icon={ReceiptText}/><Stat label="Phone Units" value={historyTotals.phones} icon={Smartphone}/><Stat label="Accessory Units" value={historyTotals.accessories} icon={Package}/><Stat label="Purchase Value" value={money(historyTotals.total)} icon={Banknote}/>
    </div>
    <div className="purchase-filters">
      <div className="filter-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search purchase no, invoice or supplier..."/></div>
      <div className="filter-control"><Filter size={15}/><select value={filterSupplier} onChange={e=>setFilterSupplier(e.target.value)}><option value="">All suppliers</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
      <label className="filter-date"><CalendarDays size={15}/><input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} title="From date"/></label>
      <label className="filter-date"><CalendarDays size={15}/><input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} title="To date"/></label>
      {(search||filterSupplier||dateFrom||dateTo)&&<button className="secondary" onClick={()=>{setSearch("");setFilterSupplier("");setDateFrom("");setDateTo("")}}>Clear</button>}
    </div>
    <div className="table-panel"><table><thead><tr><th>Purchase</th><th>Supplier</th><th>Date</th><th>Items</th><th>Total</th><th>Action</th></tr></thead><tbody>
      {loadingHistory?<tr><td colSpan="6" className="empty">Loading purchases...</td></tr>:filteredHistory.map(p=><tr key={p.id}><td><b>{p.purchase_no}</b><small>{p.invoice_no?`Invoice: ${p.invoice_no}`:"No invoice"}</small></td><td>{p.supplier||"—"}</td><td>{p.purchase_date}</td><td><b>{Number(p.item_count||0)}</b><small>{Number(p.phone_units||0)} phone · {Number(p.accessory_units||0)} accessory units</small></td><td><b>{money(p.total)}</b></td><td><button className="table-action" onClick={()=>openDetail(p)}><Eye size={14}/> View</button></td></tr>)}
      {!loadingHistory&&!filteredHistory.length&&<tr><td colSpan="6" className="empty">No purchases match your filters.</td></tr>}
    </tbody></table></div>

    {detail&&<div className="modal-bg"><div className="modal purchase-detail-modal"><div className="modal-head"><div><h3>Purchase Details</h3><small className="modal-sub">{detail.purchase_no} · {detail.supplier||"No supplier"}</small></div><button onClick={()=>setDetail(null)}><X/></button></div>{detailLoading?<div className="empty">Loading purchase details...</div>:<><div className="detail-summary"><div><span>Supplier</span><b>{detail.supplier||"—"}</b></div><div><span>Purchase date</span><b>{detail.purchase_date}</b></div><div><span>Invoice</span><b>{detail.invoice_no||"—"}</b></div><div><span>Total</span><b>{money(detail.total)}</b></div></div><h4>Purchased Items</h4><div className="table-panel"><table><thead><tr><th>Product</th><th>Type</th><th>IMEI</th><th>Qty</th><th>Unit Cost</th><th>Total</th></tr></thead><tbody>{detailItems.length?detailItems.map(i=><tr key={i.id}><td><b>{i.product_name}</b>{i.brand&&<small>{i.brand} {i.model||""}</small>}</td><td>{i.item_type}</td><td>{i.imei_1||"—"}</td><td>{i.quantity}</td><td>{money(i.unit_cost)}</td><td><b>{money(Number(i.unit_cost||0)*Number(i.quantity||1))}</b></td></tr>):<tr><td colSpan="6" className="empty">No items found.</td></tr>}</tbody></table></div><h4>Supplier Payments</h4><div className="table-panel"><table><thead><tr><th>Date</th><th>Method</th><th>Reference</th><th>Amount</th></tr></thead><tbody>{detailPayments.length?detailPayments.map(x=><tr key={x.id}><td>{new Date(x.paid_at).toLocaleDateString("en-GH")}</td><td>{x.payment_method||"Cash"}</td><td>{x.reference||"—"}</td><td><b>{money(x.amount)}</b></td></tr>):<tr><td colSpan="4" className="empty">No supplier payments recorded.</td></tr>}</tbody></table></div><div className="detail-footer"><strong>Purchase Total: {money(detail.total)}</strong><button className="secondary" onClick={printPurchase}><FileText size={15}/> Print Purchase</button></div></>}</div></div>}

    {open&&<div className="modal-bg"><div className="modal purchase-modal"><div className="modal-head"><div><h3>New Purchase / Stock In</h3><small className="modal-sub">Phones are stored as individual IMEI units.</small></div><button onClick={()=>setOpen(false)}><X/></button></div>
      <div className="form-grid two"><label>Supplier*<select value={supplierId} onChange={e=>{setSupplierId(e.target.value);const chosen=suppliers.find(x=>String(x.id)===String(e.target.value));setSupplier(chosen?.name||"")}}><option value="">Select supplier...</option>{suppliers.filter(x=>x.active!==false).map(x=><option key={x.id} value={x.id}>{x.name}{x.phone?` — ${x.phone}`:""}</option>)}</select></label><label>Invoice No.<input value={invoice} onChange={e=>setInvoice(e.target.value)} placeholder="Optional"/></label><label>Purchase date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div>
      <div className="purchase-tabs"><button className={tab==="accessory"?"selected":""} onClick={()=>setTab("accessory")}><Package size={15}/> Accessory</button><button className={tab==="phone"?"selected":""} onClick={()=>setTab("phone")}><Smartphone size={15}/> Phone / IMEI</button></div>
      {tab==="accessory"?<div className="purchase-entry"><label>Existing product<select value={accessory.product_id} onChange={e=>{const p=products.find(x=>String(x.id)===String(e.target.value));setAccessory(a=>({...a,product_id:e.target.value,unit_cost:p?.cost??a.unit_cost}))}}><option value="">Select accessory...</option>{products.filter(p=>p.category!=="Phones").map(p=><option key={p.id} value={p.id}>{p.name} — stock {p.stock}</option>)}</select></label><div className="form-grid two"><label>Quantity<input type="number" min="1" value={accessory.quantity} onChange={e=>setAccessory({...accessory,quantity:e.target.value})}/></label><label>Unit cost (GHS)<input type="number" min="0" step="0.01" value={accessory.unit_cost} onChange={e=>setAccessory({...accessory,unit_cost:e.target.value})}/></label></div><button className="secondary full" onClick={addAccessory}><Plus size={15}/> Add Accessory Line</button></div>
      :<div className="purchase-entry"><div className="form-grid two"><label>Brand*<input value={phone.brand} onChange={e=>setPhone({...phone,brand:e.target.value})}/></label><label>Model*<input value={phone.model} onChange={e=>setPhone({...phone,model:e.target.value})}/></label><label>Storage<input value={phone.storage} onChange={e=>setPhone({...phone,storage:e.target.value})} placeholder="128GB"/></label><label>RAM<input value={phone.ram} onChange={e=>setPhone({...phone,ram:e.target.value})} placeholder="8GB"/></label><label>Colour<input value={phone.color} onChange={e=>setPhone({...phone,color:e.target.value})}/></label><label>Condition<select value={phone.condition} onChange={e=>setPhone({...phone,condition:e.target.value})}><option>New</option><option>Used</option><option>Refurbished</option></select></label><label>IMEI 1*<input value={phone.imei_1} onChange={e=>setPhone({...phone,imei_1:e.target.value})}/></label><label>IMEI 2<input value={phone.imei_2} onChange={e=>setPhone({...phone,imei_2:e.target.value})}/></label><label>Cost price (GHS)*<input type="number" min="0" step="0.01" value={phone.cost} onChange={e=>setPhone({...phone,cost:e.target.value})}/></label><label>Selling price (GHS)*<input type="number" min="0" step="0.01" value={phone.selling_price} onChange={e=>setPhone({...phone,selling_price:e.target.value})}/></label><label>Warranty<input value={phone.warranty} onChange={e=>setPhone({...phone,warranty:e.target.value})} placeholder="e.g. 12 months"/></label></div><button className="secondary full" onClick={addPhone}><Plus size={15}/> Add Phone Unit</button></div>}

      <div className="draft-list"><div className="draft-head"><b>Purchase Items</b><span>{items.length} line{items.length===1?"":"s"}</span></div>{items.length?<>{items.map((i,n)=><div className="draft-line" key={n}><div><b>{i.product_name}</b><small>{i.type==="phone"?`IMEI: ${i.imei_1}`:`Qty ${i.quantity} × ${money(i.unit_cost)}`}</small></div><strong>{money(i.type==="phone"?i.cost:Number(i.unit_cost)*Number(i.quantity))}</strong><button onClick={()=>setItems(x=>x.filter((_,idx)=>idx!==n))}><X size={14}/></button></div>)}</>:<div className="empty-mini">No items added yet.</div>}</div>
      <div className="purchase-payment-box"><div className="purchase-total"><span>Total Purchase Cost</span><strong>{money(total)}</strong></div><div className="form-grid two"><label>Paid to supplier now (GHS)<input type="number" min="0" step="0.01" max={total} value={initialPayment} onChange={e=>setInitialPayment(e.target.value)} placeholder="0.00"/></label><label>Payment method<select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}>{["Cash","MTN MoMo","Telecel Cash","AirtelTigo Money","Bank Transfer","Card"].map(x=><option key={x}>{x}</option>)}</select></label><label>Payment reference<input value={paymentRef} onChange={e=>setPaymentRef(e.target.value)} placeholder="Required for electronic payments"/></label></div><div className="purchase-balance-preview"><span>Supplier balance after purchase</span><strong>{money(Math.max(0,total-Number(initialPayment||0)))}</strong></div></div>
      <button className="primary full" disabled={busy||!items.length||!supplierId} onClick={receive}>{busy?<><LoaderCircle size={16} className="spin"/> Receiving...</>:<>Receive Stock · {money(total)}</>}</button>
    </div></div>}
  </section>
}

function Suppliers({role}){
  const canManage=["owner","admin","inventory"].includes(role);
  const [suppliers,setSuppliers]=useState([]),[loading,setLoading]=useState(true),[open,setOpen]=useState(false),[editing,setEditing]=useState(null),[saving,setSaving]=useState(false),[search,setSearch]=useState(""),[statusFilter,setStatusFilter]=useState("all");
  const [payments,setPayments]=useState([]),[payOpen,setPayOpen]=useState(null),[payAmount,setPayAmount]=useState(""),[payMethod,setPayMethod]=useState("Cash"),[payRef,setPayRef]=useState("");
  const [statementOpen,setStatementOpen]=useState(null),[statement,setStatement]=useState(null),[statementLoading,setStatementLoading]=useState(false);
  const [form,setForm]=useState({name:"",phone:"",email:"",address:"",notes:""});
  async function load(){setLoading(true);const {data,error}=await supabase.from("supplier_balances").select("*").order("name");if(error)alert(error.message);else setSuppliers(data||[]);setLoading(false)}
  useEffect(()=>{load()},[]);
  async function loadPayments(id){const {data,error}=await supabase.from("supplier_payments").select("*").eq("supplier_id",id).order("paid_at",{ascending:false});if(!error)setPayments(data||[])}
  async function loadStatement(s){
    setStatementOpen(s);setStatement(null);setStatementLoading(true);
    const [purchasesRes,paymentsRes]=await Promise.all([
      supabase.from("purchases").select("id,purchase_no,invoice_no,purchase_date,total").eq("supplier_id",s.id).order("purchase_date",{ascending:true}),
      supabase.from("supplier_payments").select("id,amount,payment_method,reference,paid_at").eq("supplier_id",s.id).order("paid_at",{ascending:true})
    ]);
    if(purchasesRes.error||paymentsRes.error){alert((purchasesRes.error||paymentsRes.error).message);setStatementLoading(false);return}
    const events=[...(purchasesRes.data||[]).map(x=>({id:`purchase-${x.id}`,type:"purchase",date:x.purchase_date||x.created_at,ref:x.purchase_no||`Purchase #${x.id}`,invoice:x.invoice_no,amount:Number(x.total||0)})),...(paymentsRes.data||[]).map(x=>({id:`payment-${x.id}`,type:"payment",date:x.paid_at,ref:x.reference||"Supplier payment",method:x.payment_method,amount:Number(x.amount||0)}))].sort((a,b)=>new Date(a.date)-new Date(b.date));
    let balance=0;events.forEach(x=>{balance += x.type==="purchase"?x.amount:-x.amount;x.balance=balance});
    setStatement({supplier:s,events,purchaseTotal:(purchasesRes.data||[]).reduce((a,x)=>a+Number(x.total||0),0),paidTotal:(paymentsRes.data||[]).reduce((a,x)=>a+Number(x.amount||0),0),balance});
    setStatementLoading(false);
  }
  function printStatement(){
    if(!statement)return;
    const rows=statement.events.map(x=>`<tr><td>${new Date(x.date).toLocaleDateString("en-GH")}</td><td>${x.type==="purchase"?"Purchase":"Payment"}</td><td>${x.ref||"—"}</td><td class="num">${x.type==="purchase"?money(x.amount):"—"}</td><td class="num">${x.type==="payment"?money(x.amount):"—"}</td><td class="num">${money(x.balance)}</td></tr>`).join("");
    const w=window.open("","_blank","width=900,height=700");if(!w)return;
    w.document.write(`<html><head><title>Supplier Statement - ${statement.supplier.name}</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#171717}h1{margin:0 0 4px}p{color:#666}.summary{display:flex;gap:12px;margin:20px 0}.box{border:1px solid #ddd;border-radius:8px;padding:12px;min-width:150px}.box b{display:block;font-size:18px;margin-top:5px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border-bottom:1px solid #ddd;padding:9px;text-align:left;font-size:12px}.num{text-align:right}@media print{body{padding:10px}}</style></head><body><h1>G-LOKOO PHONES AND ACCESSORIES</h1><p>Supplier Statement · ${statement.supplier.name}</p><p>${statement.supplier.phone||""} ${statement.supplier.email||""}</p><div class="summary"><div class="box">Purchases<b>${money(statement.purchaseTotal)}</b></div><div class="box">Payments<b>${money(statement.paidTotal)}</b></div><div class="box">Balance<b>${money(statement.balance)}</b></div></div><table><thead><tr><th>Date</th><th>Type</th><th>Reference</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th></tr></thead><tbody>${rows||'<tr><td colspan="6">No transactions.</td></tr>'}</tbody></table><script>window.onload=()=>{window.print()}</script></body></html>`);w.document.close();
  }
  function reset(){setForm({name:"",phone:"",email:"",address:"",notes:""});setEditing(null)}
  async function save(){if(!form.name.trim()){alert("Supplier name is required.");return}setSaving(true);const payload={name:form.name.trim(),phone:form.phone.trim()||null,email:form.email.trim()||null,address:form.address.trim()||null,notes:form.notes.trim()||null};const q=editing?supabase.from("suppliers").update(payload).eq("id",editing.id):supabase.from("suppliers").insert(payload);const {error}=await q;setSaving(false);if(error)alert(error.message);else{setOpen(false);reset();load()}}
  async function toggleActive(s){const {error}=await supabase.from("suppliers").update({active:!s.active}).eq("id",s.id);if(error)alert(error.message);else load()}
  async function recordPayment(){const amount=Number(payAmount||0);if(!payOpen||amount<=0){alert("Enter a payment amount greater than ₵0.00.");return}if(amount>Number(payOpen.balance||0)){alert(`Payment cannot exceed the outstanding balance of ${money(payOpen.balance)}.`);return}if(["MTN MoMo","Telecel Cash","AirtelTigo Money","Bank Transfer","Card"].includes(payMethod)&&!payRef.trim()){alert("Enter the transaction reference.");return}const {data:{user}}=await supabase.auth.getUser();const {error}=await supabase.from("supplier_payments").insert({supplier_id:payOpen.id,amount,payment_method:payMethod,reference:payRef.trim()||null,paid_by:user?.id||null});if(error)alert(error.message);else{alert(`Supplier payment of ${money(amount)} recorded.`);setPayOpen(null);setPayAmount("");setPayRef("");load()}}
  const filtered=suppliers.filter(s=>{const text=`${s.name} ${s.phone||""} ${s.email||""}`.toLowerCase();const matchesSearch=text.includes(search.toLowerCase());const matchesStatus=statusFilter==="all"||(statusFilter==="active"&&s.active)||(statusFilter==="inactive"&&!s.active);return matchesSearch&&matchesStatus;});
  function exportSuppliers(){
    const headers=["Supplier","Phone","Email","Address","Status","Purchase Value","Paid","Balance"];
    const rows=filtered.map(s=>[s.name,s.phone||"",s.email||"",s.address||"",s.active?"Active":"Inactive",Number(s.purchase_total||0).toFixed(2),Number(s.paid_total||0).toFixed(2),Number(s.balance||0).toFixed(2)]);
    const csv=[headers,...rows].map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`g-looko-suppliers-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
  }
  const totals=suppliers.reduce((a,s)=>({p:a.p+Number(s.purchase_total||0),paid:a.paid+Number(s.paid_total||0),bal:a.bal+Number(s.balance||0)}),{p:0,paid:0,bal:0});
  return <section className="content"><div className="section-head"><div><h2>Suppliers</h2><p>Manage suppliers, purchases and outstanding supplier balances.</p></div>{canManage&&<button className="primary" onClick={()=>{reset();setOpen(true)}}><Plus size={17}/> Add Supplier</button>}</div>
    <div className="stats supplier-stats"><Stat label="Suppliers" value={suppliers.length} icon={Building2}/><Stat label="Purchase Value" value={money(totals.p)} icon={ReceiptText}/><Stat label="Paid to Suppliers" value={money(totals.paid)} icon={WalletCards}/><Stat label="Supplier Balance" value={money(totals.bal)} icon={Banknote}/></div>
    <div className="panel customer-toolbar supplier-toolbar"><div className="searchbar"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search supplier name, phone or email..."/></div><div className="supplier-toolbar-actions"><label className="supplier-status-filter">Status<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">All suppliers</option><option value="active">Active only</option><option value="inactive">Inactive only</option></select></label><button className="secondary" onClick={exportSuppliers} disabled={!filtered.length}><Download size={15}/> Export CSV</button></div></div>
    <div className="table-panel"><table><thead><tr><th>Supplier</th><th>Contact</th><th>Purchases</th><th>Paid</th><th>Balance</th><th>Status</th><th>Action</th></tr></thead><tbody>{loading&&<tr><td colSpan="7" className="empty">Loading suppliers...</td></tr>}{!loading&&!filtered.length&&<tr><td colSpan="7" className="empty">No suppliers found.</td></tr>}{!loading&&filtered.map(s=><tr key={s.id}><td><b>{s.name}</b><small>{s.email||s.address||""}</small></td><td>{s.phone||"—"}</td><td>{money(s.purchase_total)}</td><td>{money(s.paid_total)}</td><td><b className={Number(s.balance)>0?"balance-due":"balance-clear"}>{money(s.balance)}</b></td><td><span className={`badge ${s.active?"ok":"warn"}`}>{s.active?"Active":"Inactive"}</span></td><td><div className="table-actions"><button className="table-action" onClick={()=>loadStatement(s)}>Statement</button><button className="table-action" onClick={()=>{setPayOpen(s);setPayAmount("");setPayMethod("Cash");setPayRef("");loadPayments(s.id)}} disabled={!canManage||Number(s.balance)<=0}>Pay</button>{canManage&&<button className="table-action" onClick={()=>{setEditing(s);setForm({name:s.name,phone:s.phone||"",email:s.email||"",address:s.address||"",notes:s.notes||""});setOpen(true)}}>Edit</button>}{canManage&&<button className="table-action" onClick={()=>toggleActive(s)}>{s.active?"Deactivate":"Activate"}</button>}</div></td></tr>)}</tbody></table></div>
    {open&&<Modal title={editing?"Edit Supplier":"Add Supplier"} close={()=>!saving&&setOpen(false)}><div className="form-grid two"><label>Supplier name*<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Phone<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Address<input value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label><label>Notes<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label></div><button className="primary full" disabled={saving} onClick={save}>{saving?<><LoaderCircle size={16} className="spin"/> Saving...</>:"Save Supplier"}</button></Modal>}
    {statementOpen&&<Modal title={`Supplier Statement · ${statementOpen.name}`} close={()=>{setStatementOpen(null);setStatement(null)}}><div className="statement-actions"><button className="secondary" onClick={printStatement} disabled={!statement}><FileText size={15}/> Print Statement</button></div>{statementLoading?<div className="empty">Loading supplier statement...</div>:statement&&<><div className="stats supplier-statement-stats"><Stat label="Purchases" value={money(statement.purchaseTotal)} icon={ReceiptText}/><Stat label="Payments" value={money(statement.paidTotal)} icon={WalletCards}/><Stat label="Balance" value={money(statement.balance)} icon={Banknote}/></div><div className="statement-meta"><b>{statement.supplier.name}</b><span>{statement.supplier.phone||""}{statement.supplier.email?` · ${statement.supplier.email}`:""}</span></div><div className="table-panel supplier-statement-table"><table><thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>{statement.events.length?statement.events.slice().reverse().map(x=><tr key={x.id}><td>{new Date(x.date).toLocaleDateString("en-GH")}</td><td><span className={`badge ${x.type==="purchase"?"warn":"ok"}`}>{x.type==="purchase"?"Purchase":"Payment"}</span></td><td><b>{x.ref||"—"}</b>{x.invoice&&<small>Invoice: {x.invoice}</small>}{x.method&&<small>{x.method}</small>}</td><td>{x.type==="purchase"?money(x.amount):"—"}</td><td>{x.type==="payment"?money(x.amount):"—"}</td><td><b>{money(x.balance)}</b></td></tr>):<tr><td colSpan="6" className="empty">No transactions found.</td></tr>}</tbody></table></div></>}</Modal>}
    {payOpen&&<Modal title={`Supplier Payment · ${payOpen.name}`} close={()=>setPayOpen(null)}><div className="balance-box"><span>Outstanding supplier balance</span><strong>{money(payOpen.balance)}</strong></div><label>Amount paid (GHS)*<input type="number" min="0.01" step="0.01" max={payOpen.balance} value={payAmount} onChange={e=>setPayAmount(e.target.value)} placeholder="0.00"/></label><label>Payment method<select value={payMethod} onChange={e=>setPayMethod(e.target.value)}>{["Cash","MTN MoMo","Telecel Cash","AirtelTigo Money","Bank Transfer","Card"].map(x=><option key={x}>{x}</option>)}</select></label><label>Reference<input value={payRef} onChange={e=>setPayRef(e.target.value)} placeholder="Optional / transaction reference"/></label>{payments.length>0&&<div className="supplier-payment-history"><b>Recent payments</b>{payments.slice(0,5).map(x=><div key={x.id}><span>{new Date(x.paid_at).toLocaleDateString("en-GH")} · {x.payment_method}</span><strong>{money(x.amount)}</strong></div>)}</div>}<button className="primary full" onClick={recordPayment}>Record Payment · {money(Number(payAmount||0))}</button></Modal>}
  </section>
}

function openWhatsApp(customer,message){
  const raw=String(customer?.phone||"").replace(/[^0-9+]/g,"");
  if(!raw){alert("This customer does not have a phone number.");return;}
  let phone=raw.replace(/^\+/,'');
  if(phone.startsWith("0")) phone="233"+phone.slice(1);
  const text=encodeURIComponent(message);
  window.open(`https://wa.me/${phone}?text=${text}`,"_blank","noopener,noreferrer");
}

function Customers({customers,reload,role}){
  const [open,setOpen]=useState(false),[historyOpen,setHistoryOpen]=useState(null),[search,setSearch]=useState("");
  const [name,setName]=useState(""),[phone,setPhone]=useState(""),[email,setEmail]=useState(""),[address,setAddress]=useState("");
  const [history,setHistory]=useState([]),[loading,setLoading]=useState(false),[balances,setBalances]=useState({});
  const [paymentSale,setPaymentSale]=useState(null),[paymentAmount,setPaymentAmount]=useState(""),[paymentMethod,setPaymentMethod]=useState("Cash"),[paymentRef,setPaymentRef]=useState(""),[paying,setPaying]=useState(false);
  useEffect(()=>{
    async function loadBalances(){
      const {data,error}=await supabase.from("sales").select("customer_id,balance_due").not("customer_id","is",null).gt("balance_due",0);
      if(error){console.error("Could not load customer balances:",error);return;}
      const next={};
      (data||[]).forEach(s=>{next[s.customer_id]=(next[s.customer_id]||0)+Number(s.balance_due||0)});
      setBalances(next);
    }
    loadBalances();
  },[customers]);
  const filtered=customers.filter(c=>`${c.name} ${c.phone||""} ${c.email||""}`.toLowerCase().includes(search.toLowerCase()));
  function reset(){setName("");setPhone("");setEmail("");setAddress("");}
  async function save(){
    if(!name.trim()||!phone.trim()){alert("Customer name and phone number are required.");return;}
    const {error}=await supabase.from("customers").insert({name:name.trim(),phone:phone.trim(),email:email.trim()||null,address:address.trim()||null});
    if(error)alert(error.message);else{setOpen(false);reset();reload();}
  }
  async function viewStatusHistory(r){
    setHistoryRepair(r);setHistoryLoading(true);
    const {data,error}=await supabase.from("repair_status_history").select("id,old_status,new_status,changed_by,changed_at").eq("repair_id",r.id).order("changed_at",{ascending:false});
    if(error){alert(error.message);setStatusHistory([])}else setStatusHistory(data||[]);
    setHistoryLoading(false);
  }
  async function recordPayment(){
    if(!paymentSale)return;
    const amount=Number(paymentAmount||0);
    if(!Number.isFinite(amount)||amount<=0){alert("Enter a payment amount greater than ₵0.00.");return;}
    if(amount>Number(paymentSale.balance_due||0)){alert(`Payment cannot exceed the outstanding balance of ${money(paymentSale.balance_due)}.`);return;}
    if(["MTN MoMo","Telecel Cash","AirtelTigo Money","Bank Transfer"].includes(paymentMethod)&&!paymentRef.trim()){alert("Please enter the transaction reference.");return;}
    setPaying(true);
    try{
      const {data:{user}}=await supabase.auth.getUser();
      const {error}=await supabase.rpc("record_customer_payment",{p_sale_id:paymentSale.id,p_amount:amount,p_payment_method:paymentMethod,p_payment_reference:paymentRef.trim(),p_paid_by:user?.id||null});
      if(error)throw error;
      alert(`Payment of ${money(amount)} recorded successfully.`);
      setPaymentSale(null);setPaymentAmount("");setPaymentRef("");
      await viewHistory(historyOpen);
      reload();
    }catch(e){alert(`Payment could not be recorded.
${e.message||e}`)}
    finally{setPaying(false)}
  }

  async function viewHistory(customer){
    setHistoryOpen(customer);setLoading(true);
    const {data,error}=await supabase.from("sales").select("id,receipt_no,total,amount_paid,balance_due,payment_status,payment_method,payment_reference,due_date,created_at,sale_items(product_name,imei,quantity,unit_price,line_total)").eq("customer_id",customer.id).order("created_at",{ascending:false});
    if(error){alert(error.message);setHistory([]);}else setHistory(data||[]);setLoading(false);
  }
  return <section className="content">
    <div className="section-head"><div><h2>Customers</h2><p>{role==="cashier"?"Cashier access: add customers, view history and record payments.":"Manage customers and view their complete purchase history."}</p></div><button className="primary" onClick={()=>{reset();setOpen(true)}}><Plus size={17}/> Add Customer</button></div>
    <div className="panel customer-toolbar"><div className="searchbar"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customer name, phone or email..."/></div></div>
    <div className="table-panel"><table><thead><tr><th>Customer</th><th>Phone</th><th>Email</th><th>Balance</th><th>Purchases</th><th>Action</th></tr></thead><tbody>
      {filtered.map(c=><CustomerRow key={c.id} customer={c} balance={balances[c.id]||0} onHistory={viewHistory}/>) }
      {!filtered.length&&<tr><td colSpan="6" className="empty">{customers.length?"No customers match your search.":"No customers yet. Click Add Customer to create the first record."}</td></tr>}
    </tbody></table></div>
    {open&&<Modal title="Add Customer" close={()=>setOpen(false)}>
      <label>Full name*<input value={name} onChange={e=>setName(e.target.value)} placeholder="Customer name"/></label>
      <label>Phone number*<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="024 XXX XXXX"/></label>
      <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Optional"/></label>
      <label>Address<input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Optional"/></label>
      <button className="primary full" onClick={save}>Save Customer</button>
    </Modal>}
    {historyOpen&&<div className="modal-bg"><div className="modal history-modal"><div className="modal-head"><div><h3>{historyOpen.name}</h3><small className="modal-sub">{historyOpen.phone||"No phone"} · Purchase history</small></div><button onClick={()=>setHistoryOpen(null)}><X/></button></div>
      {loading?<div className="empty-mini">Loading purchase history...</div>:history.length?<div className="history-list">{history.map(s=><div className="history-card" key={s.id}><div className="history-card-head"><div><b>{s.receipt_no}</b><small>{new Date(s.created_at).toLocaleString("en-GH",{dateStyle:"medium",timeStyle:"short"})}</small></div><strong>{money(s.total)}</strong></div><div>{(s.sale_items||[]).map((i,n)=><div className="history-item" key={n}><span>{i.product_name}{i.imei?<small>IMEI: {i.imei}</small>:<small>{i.quantity} × {money(i.unit_price)}</small>}</span><b>{money(i.line_total)}</b></div>)}</div><div className="history-payment">Payment: {s.payment_method} · {s.payment_status||"Paid"}{Number(s.amount_paid||0)>0?` · Paid ${money(s.amount_paid)}`:""}{Number(s.balance_due||0)>0?` · Balance ${money(s.balance_due)}`:""}{s.due_date?` · Due ${new Date(`${s.due_date}T00:00:00`).toLocaleDateString("en-GH")}`:""}{Number(s.balance_due||0)>0&&<button className="table-action" onClick={()=>{setPaymentSale(s);setPaymentAmount("");setPaymentMethod("Cash");setPaymentRef("")}}>Record Payment</button>}</div></div>)}</div>:<div className="empty-mini">No purchases recorded for this customer.</div>}
    </div></div>}
    {paymentSale&&<Modal title={`Record Payment · ${paymentSale.receipt_no}`} close={()=>!paying&&setPaymentSale(null)}>
      <div className="balance-box"><span>Outstanding balance</span><strong>{money(paymentSale.balance_due)}</strong></div>
      <label>Amount paid (GHS)*<input type="number" min="0.01" step="0.01" max={paymentSale.balance_due} value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)} placeholder="0.00"/></label>
      <label>Payment method<select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}>{["Cash","MTN MoMo","Telecel Cash","AirtelTigo Money","Bank Transfer","Card"].map(x=><option key={x}>{x}</option>)}</select></label>
      {["MTN MoMo","Telecel Cash","AirtelTigo Money","Bank Transfer"].includes(paymentMethod)&&<label>Transaction reference*<input value={paymentRef} onChange={e=>setPaymentRef(e.target.value)} placeholder="Reference number"/></label>}
      <button className="primary full" disabled={paying} onClick={recordPayment}>{paying?<><LoaderCircle size={16} className="spin"/> Recording...</>:<>Record Payment · {money(Number(paymentAmount||0))}</>}</button>
    </Modal>}
  </section>
}
function CustomerRow({customer,balance,onHistory}){return <tr><td><b>{customer.name}</b><small>{customer.address||"Customer"}</small></td><td>{customer.phone||"—"}</td><td>{customer.email||"—"}</td><td><strong className={balance>0?"balance-text":"paid-text"}>{money(balance)}</strong></td><td><span className="badge ok">View history</span></td><td><div className="table-actions"><button className="table-action" onClick={()=>onHistory(customer)}>History</button><button className="table-action" onClick={()=>openWhatsApp(customer,`Hello ${customer.name}, this is G-LOKOO PHONES AND ACCESSORIES. Thank you for shopping with us.`)}><MessageCircle size={13}/> WhatsApp</button></div></td></tr>}
function Repairs({customers=[]}){
  const today=new Date().toISOString().slice(0,10);
  const statuses=["Received","Diagnosing","Repairing","Ready","Collected","Cancelled"];
  const [repairs,setRepairs]=useState([]),[technicians,setTechnicians]=useState([]),[loading,setLoading]=useState(true),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[search,setSearch]=useState(""),[filter,setFilter]=useState("All");
  const [paymentRepair,setPaymentRepair]=useState(null),[paymentAmount,setPaymentAmount]=useState(""),[paymentMethod,setPaymentMethod]=useState("Cash"),[paymentRef,setPaymentRef]=useState(""),[paying,setPaying]=useState(false);
  const [historyRepair,setHistoryRepair]=useState(null),[statusHistory,setStatusHistory]=useState([]),[historyLoading,setHistoryLoading]=useState(false);
  const [form,setForm]=useState({customer_id:"",device:"",imei:"",fault:"",technician_id:"",status:"Received",repair_cost:"",amount_paid:"",due_date:"",notes:""});

  async function load(){
    setLoading(true);
    const [rr,tr]=await Promise.all([
      supabase.from("repairs").select("*").order("created_at",{ascending:false}),
      supabase.from("profiles").select("id,full_name,role").in("role",["owner","admin","technician"]).order("full_name")
    ]);
    if(rr.error) alert(rr.error.message); else setRepairs(rr.data||[]);
    if(!tr.error) setTechnicians(tr.data||[]);
    setLoading(false);
  }
  useEffect(()=>{load()},[]);

  function reset(){setForm({customer_id:"",device:"",imei:"",fault:"",technician_id:"",status:"Received",repair_cost:"",amount_paid:"",due_date:"",notes:""})}
  async function save(){
    if(!form.customer_id||!form.device.trim()||!form.fault.trim()){alert("Customer, device and fault are required.");return}
    const cost=Number(form.repair_cost||0),paid=Number(form.amount_paid||0);
    if(cost<0||paid<0||paid>cost){alert("Please check the repair cost and amount paid.");return}
    setBusy(true);
    const job_no=`REP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const {error}=await supabase.from("repairs").insert({job_no,customer_id:Number(form.customer_id),device:form.device.trim(),imei:form.imei.trim()||null,fault:form.fault.trim(),technician_id:form.technician_id||null,status:form.status,repair_cost:cost,amount_paid:paid,balance_due:Math.max(cost-paid,0),payment_status:paid>=cost?"Paid":paid>0?"Part Payment":cost>0?"Credit":"No Charge",due_date:form.due_date||null,notes:form.notes.trim()||null});
    setBusy(false);
    if(error){alert(error.message);return}
    setOpen(false);reset();await load();
  }
  async function updateStatus(r,status){
    if(status===r.status) return;
    if(r.status==="Collected" && status!=="Collected"){
      if(!confirm("This repair is already marked Collected. Reopen it?")) return;
    }
    if(status==="Collected" && Number(r.balance_due||0)>0){
      alert(`This repair cannot be marked Collected until the outstanding balance of ${money(r.balance_due)} is fully paid.`);
      return;
    }
    if(status==="Collected" && r.status==="Cancelled"){
      alert("A cancelled repair must be reopened before it can be collected.");
      return;
    }
    const patch={status};
    if(status==="Collected") patch.completed_at=new Date().toISOString();
    else if(r.status==="Collected") patch.completed_at=null;
    const {error}=await supabase.from("repairs").update(patch).eq("id",r.id);
    if(error) alert(error.message); else await load();
  }
  async function recordPayment(){
    const amount=Number(paymentAmount||0);
    if(!paymentRepair||amount<=0||amount>Number(paymentRepair.balance_due||0)){alert("Enter a valid payment amount.");return}
    if(["MTN MoMo","Telecel Cash","AirtelTigo Money","Bank Transfer","Card"].includes(paymentMethod)&&!paymentRef.trim()){alert("Transaction reference is required for this payment method.");return}
    setPaying(true);
    const {data,error}=await supabase.rpc("record_repair_payment",{p_repair_id:paymentRepair.id,p_amount:amount,p_method:paymentMethod,p_reference:paymentRef.trim()||null});
    setPaying(false);
    if(error){alert(error.message);return}
    setPaymentRepair(null);setPaymentAmount("");setPaymentRef("");await load();
  }
  const filtered=repairs.filter(r=>{
    const q=`${r.job_no||""} ${r.device||""} ${r.imei||""} ${r.fault||""}`.toLowerCase().includes(search.toLowerCase());
    return q&&(filter==="All"||r.status===filter);
  });
  const counts=Object.fromEntries(statuses.map(s=>[s,repairs.filter(r=>r.status===s).length]));
  const customerName=id=>customers.find(c=>c.id===id)?.name||"Unknown customer";
  const techName=id=>technicians.find(t=>t.id===id)?.full_name||"Unassigned";
  return <section className="content">
    <div className="section-head"><div><h2>Repairs & Service</h2><p>Track repair jobs from intake to customer collection.</p></div><button className="primary" onClick={()=>{reset();setOpen(true)}}><Plus size={17}/> New Repair</button></div>
    <div className="repair-summary">{statuses.map(s=><button key={s} className={filter===s?"selected":""} onClick={()=>setFilter(filter===s?"All":s)}><span>{s}</span><strong>{counts[s]||0}</strong></button>)}</div>
    <div className="panel customer-toolbar"><div className="searchbar"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search job number, device, IMEI or fault..."/></div><select className="repair-filter" value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option>{statuses.map(s=><option key={s}>{s}</option>)}</select></div>
    <div className="repair-list">
      {loading&&<div className="empty-mini">Loading repair jobs...</div>}
      {!loading&&!filtered.length&&<div className="empty-mini">{repairs.length?"No repair jobs match your search.":"No repair jobs yet. Click New Repair to create the first ticket."}</div>}
      {!loading&&filtered.map(r=><div className="repair-ticket" key={r.id}>
        <div className="repair-ticket-top"><div><b>{r.job_no}</b><small>{new Date(r.created_at).toLocaleString("en-GH",{dateStyle:"medium",timeStyle:"short"})}{r.completed_at?` · Collected ${new Date(r.completed_at).toLocaleString("en-GH",{dateStyle:"medium",timeStyle:"short"})}`:""}</small></div><select className={`status-select status-${String(r.status||"").toLowerCase()}`} value={r.status} onChange={e=>updateStatus(r,e.target.value)}>{statuses.map(s=><option key={s}>{s}</option>)}</select></div>
        <div className="repair-ticket-grid"><div><span>Customer</span><strong>{customerName(r.customer_id)}</strong></div><div><span>Device</span><strong>{r.device}</strong></div><div><span>IMEI</span><strong>{r.imei||"—"}</strong></div><div><span>Technician</span><strong>{techName(r.technician_id)}</strong></div></div>
        <div className="repair-fault"><span>Reported fault</span><p>{r.fault}</p>{r.notes&&<small>{r.notes}</small>}</div>
        <div className="repair-ticket-bottom"><div><span>Repair cost</span><strong>{money(r.repair_cost)}</strong></div><div><span>Paid</span><strong>{money(r.amount_paid||0)}</strong></div><div><span>Balance</span><strong className={Number(r.balance_due||0)>0?"balance-text":"paid-text"}>{money(r.balance_due||0)}</strong></div><button className="table-action" onClick={()=>viewStatusHistory(r)}>History</button>{Number(r.balance_due||0)>0&&r.status!=="Cancelled"&&<button className="table-action" onClick={()=>{setPaymentRepair(r);setPaymentAmount("");setPaymentMethod("Cash");setPaymentRef("")}}>Record Payment</button>}</div>
      </div>)}
    </div>
    {open&&<Modal title="New Repair Job" close={()=>!busy&&setOpen(false)}>
      <label>Customer*<select value={form.customer_id} onChange={e=>setForm({...form,customer_id:e.target.value})}><option value="">Select customer</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name} · {c.phone||"No phone"}</option>)}</select></label>
      <label>Device / Phone*<input value={form.device} onChange={e=>setForm({...form,device:e.target.value})} placeholder="Samsung Galaxy A17"/></label>
      <label>IMEI<input value={form.imei} onChange={e=>setForm({...form,imei:e.target.value})} placeholder="Optional IMEI"/></label>
      <label>Reported fault*<textarea value={form.fault} onChange={e=>setForm({...form,fault:e.target.value})} placeholder="Describe the customer's problem" rows="3"/></label>
      <label>Technician<select value={form.technician_id} onChange={e=>setForm({...form,technician_id:e.target.value})}><option value="">Unassigned</option>{technicians.map(t=><option key={t.id} value={t.id}>{t.full_name||t.id} · {t.role}</option>)}</select></label>
      <div className="form-grid-2"><label>Repair cost (GHS)<input type="number" min="0" step="0.01" value={form.repair_cost} onChange={e=>setForm({...form,repair_cost:e.target.value})}/></label><label>Amount paid<input type="number" min="0" step="0.01" value={form.amount_paid} onChange={e=>setForm({...form,amount_paid:e.target.value})}/></label></div>
      <div className="form-grid-2"><label>Due date<input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})}/></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{statuses.map(s=><option key={s}>{s}</option>)}</select></label></div>
      <label>Notes<input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Accessories received, password, parts needed, etc."/></label>
      <button className="primary full" disabled={busy} onClick={save}>{busy?<><LoaderCircle size={16} className="spin"/> Saving...</>:<>Create Repair · {money(Number(form.repair_cost||0))}</>}</button>
    </Modal>}
    {historyRepair&&<Modal title={`Repair History · ${historyRepair.job_no}`} close={()=>setHistoryRepair(null)}>
      <div className="repair-history-head"><b>{historyRepair.device}</b><span>{customerName(historyRepair.customer_id)} · Current status: {historyRepair.status}</span></div>
      {historyLoading?<div className="empty-mini">Loading status history...</div>:<div className="status-history-list">
        {!statusHistory.length&&<div className="empty-mini">No status changes recorded yet. The repair was created as <b>{historyRepair.status}</b>.</div>}
        {statusHistory.map(h=><div className="status-history-row" key={h.id}><div className="status-history-dot"/><div><b>{h.old_status||"Created"} → {h.new_status}</b><small>{new Date(h.changed_at).toLocaleString("en-GH",{dateStyle:"medium",timeStyle:"short"})}</small></div></div>)}
      </div>}
    </Modal>}
    {paymentRepair&&<Modal title={`Repair Payment · ${paymentRepair.job_no}`} close={()=>!paying&&setPaymentRepair(null)}>
      <div className="balance-box"><span>Outstanding repair balance</span><strong>{money(paymentRepair.balance_due)}</strong></div>
      <label>Amount paid (GHS)*<input type="number" min="0.01" step="0.01" max={paymentRepair.balance_due} value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)} placeholder="0.00"/></label>
      <label>Payment method<select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}>{["Cash","MTN MoMo","Telecel Cash","AirtelTigo Money","Bank Transfer","Card"].map(x=><option key={x}>{x}</option>)}</select></label>
      {["MTN MoMo","Telecel Cash","AirtelTigo Money","Bank Transfer","Card"].includes(paymentMethod)&&<label>Transaction reference*<input value={paymentRef} onChange={e=>setPaymentRef(e.target.value)} placeholder="Reference number"/></label>}
      <button className="primary full" disabled={paying} onClick={recordPayment}>{paying?<><LoaderCircle size={16} className="spin"/> Recording...</>:<>Record Payment · {money(Number(paymentAmount||0))}</>}</button>
    </Modal>}
  </section>
}
function Staff({currentProfile,reload}){
  const [staff,setStaff]=useState([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(null),[search,setSearch]=useState("");
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false);
  const [form,setForm]=useState({full_name:"",email:"",phone:"",role:"cashier",password:""});
  const roles=["owner","admin","cashier","inventory","technician"];
  const managementRoles=["admin","cashier","inventory","technician"];

  async function load(){
    setLoading(true);
    const {data,error}=await supabase.rpc("get_staff_directory");
    if(error) alert(error.message); else setStaff(data||[]);
    setLoading(false);
  }
  useEffect(()=>{load()},[]);

  async function changeRole(member,next){
    if(member.id===currentProfile?.id && next!=="owner" && !confirm("Change your own role? Make sure another Owner account can still manage staff.")) return;
    if(member.role==="owner" && next!=="owner" && !confirm(`Remove Owner role from ${member.full_name||"this account"}?`)) return;
    setSaving(member.id);
    const {error}=await supabase.from("profiles").update({role:next}).eq("id",member.id);
    setSaving(null);
    if(error) alert(error.message);
    else { await load(); if(member.id===currentProfile?.id) await reload(); }
  }

  async function toggleActive(member){
    if(member.id===currentProfile?.id && member.active){ alert("You cannot deactivate your own account."); return; }
    const next=!member.active;
    if(!confirm(`${next?"Activate":"Deactivate"} ${member.full_name||"this staff account"}?`)) return;
    setSaving(member.id);
    const {error}=await supabase.from("profiles").update({active:next}).eq("id",member.id);
    setSaving(null);
    if(error) alert(error.message); else await load();
  }

  async function resetPassword(member){
    if(!member.email) return alert("This staff account does not have an email address available for password reset.");
    if(!confirm(`Send a password reset email to ${member.email}?`)) return;
    setSaving(member.id);
    const {error}=await supabase.auth.resetPasswordForEmail(member.email,{redirectTo:window.location.origin});
    setSaving(null);
    if(error) alert(error.message); else alert(`Password reset email sent to ${member.email}.`);
  }

async function deleteStaff(member){
  if(!member?.id) return;

  const confirmed=window.confirm(
    `Delete staff account "${member.full_name || member.email}"?\n\nThis will permanently remove the staff profile and login account.`
  );

  if(!confirmed) return;

  try{
    setSaving(member.id);

    const {data:{session}}=await supabase.auth.getSession();

    if(!session?.access_token){
      throw new Error("Your session has expired. Please sign in again.");
    }

    const response=await fetch(`${API_BASE_URL}/api/delete-staff`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":`Bearer ${session.access_token}`
      },
      body:JSON.stringify({id:member.id})
    });

    const result=await response.json();

    if(!response.ok){
      throw new Error(result.error || "Could not delete staff account.");
    }

    alert(result.message || "Staff account deleted successfully.");

    await load();
  }catch(error){
    console.error("Delete staff error:",error);
    alert(error?.message || "Could not delete staff account.");
  }finally{
    setSaving(null);
  }
}


  function resetForm(){setForm({full_name:"",email:"",phone:"",role:"cashier",password:""});setOpen(false)}

  async function createStaff(e){
    e?.preventDefault();
    if(!form.full_name.trim()||!form.email.trim()||!form.password) return alert("Name, email and password are required.");
    if(form.password.length<8) return alert("Password must be at least 8 characters.");
    setBusy(true);
    try{
      const {data:{session}}=await supabase.auth.getSession();
      const response=await fetch(`${API_BASE_URL}/api/create-staff`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session?.access_token||""}`},body:JSON.stringify(form)});
      const result=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(result.error||"Could not create staff account.");
      alert(`Staff account created for ${form.full_name}.`);
      resetForm(); await load();
    }catch(e){alert(e.message||String(e))}
    finally{setBusy(false)}
  }

  const filtered=staff.filter(s=>`${s.full_name||""} ${s.phone||""} ${s.role||""} ${s.email||""}`.toLowerCase().includes(search.toLowerCase()));
  const activeCount=staff.filter(s=>s.active).length;
  const inactiveCount=staff.filter(s=>!s.active).length;
  const info={owner:"Full control, staff and settings.",admin:"Management, reports, expenses and staff.",cashier:"Sales and customer checkout.",inventory:"Products, phone IMEI and purchases.",technician:"Repairs and assigned repair work."};
  const dateTime=v=>v?new Date(v).toLocaleString("en-GH",{dateStyle:"medium",timeStyle:"short"}):"Never";

  return <section className="content">
    <div className="section-head"><div><h2>Staff & Permissions 2.0</h2><p>Create accounts, manage access, reset passwords and review staff activity.</p></div><div className="section-actions"><button className="primary" onClick={()=>setOpen(true)}><Plus size={16}/> New Staff Account</button><button className="secondary" onClick={load}><History size={16}/> Refresh</button></div></div>
    <div className="staff-role-grid">{roles.map(r=><div className="staff-role-card" key={r}><div className="staff-role-icon"><ShieldCheck size={17}/></div><div><b>{r[0].toUpperCase()+r.slice(1)}</b><small>{info[r]}</small></div></div>)}</div>
    <div className="staff-summary"><div><span>Total staff</span><b>{staff.length}</b></div><div><span>Active</span><b>{activeCount}</b></div><div><span>Inactive</span><b>{inactiveCount}</b></div><div><span>Owners</span><b>{staff.filter(s=>s.role==="owner"&&s.active).length}</b></div></div>
    <div className="panel customer-toolbar"><div className="searchbar"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search staff name, email, phone or role..."/></div></div>
    <div className="table-panel staff-table-wrap"><table><thead><tr><th>Staff member</th><th>Phone</th><th>Role</th><th>Status</th><th>Last login</th><th>Created</th><th>Actions</th></tr></thead><tbody>
    {loading&&<tr><td colSpan="7" className="empty">Loading staff accounts...</td></tr>}
    {!loading&&!filtered.length&&<tr><td colSpan="7" className="empty">No staff accounts found.</td></tr>}
    {!loading&&filtered.map(m=><tr key={m.id}>
      <td><b>{m.full_name||"Unnamed staff"}</b><small>{m.email||m.id}</small></td>
      <td>{m.phone||"—"}</td>
      <td><select className="role-select" value={m.role} disabled={saving===m.id} onChange={e=>changeRole(m,e.target.value)}>{roles.map(r=><option key={r}>{r}</option>)}</select></td>
      <td><button className={`status-pill ${m.active?"active":"inactive"}`} disabled={saving===m.id} onClick={()=>toggleActive(m)}>{m.active?"Active":"Inactive"}</button></td>
      <td>{dateTime(m.last_sign_in_at)}</td>
      <td>{m.created_at?new Date(m.created_at).toLocaleDateString("en-GH"):"—"}</td>
<td><div className="staff-actions"><button className="table-action" disabled={saving===m.id} onClick={()=>resetPassword(m)}><KeyRound size={14}/> Reset</button><button className="table-action" disabled={saving===m.id || m.role==="owner"} onClick={()=>deleteStaff(m)} title={m.role==="owner" ? "Owner accounts cannot be deleted" : "Delete staff account"}>Delete</button></div></td>
    </tr>)}</tbody></table></div>
    <div className="staff-note"><ShieldCheck size={18}/><div><b>Security protections</b><span>At least one active Owner must remain. Owners cannot deactivate their own account. Inactive accounts are blocked from entering the POS, and role/status changes are written to Audit Log.</span></div></div>
    {open&&<Modal title="Create New Staff Account" close={()=>!busy&&resetForm()}>
      <form onSubmit={createStaff}>
        <label>Full name*<input required value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} placeholder="Staff name"/></label>
        <label>Email address*<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="staff@example.com"/></label>
        <div className="form-grid-2"><label>Phone<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="024..."/></label><label>Role<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>{managementRoles.map(r=><option key={r}>{r}</option>)}</select></label></div>
        <label>Temporary password*<input required type="password" minLength="8" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Minimum 8 characters"/></label>
        <div className="form-hint">The new account is created as an active staff login. The staff member can use the password immediately.</div>
        <button className="primary full" disabled={busy}>{busy?<><LoaderCircle size={16} className="spin"/> Creating...</>:<><Plus size={16}/> Create Staff Account</>}</button>
      </form>
    </Modal>}
  </section>
}
function Expenses(){
  const today = new Date().toISOString().slice(0,10);
  const [expenses,setExpenses]=useState([]);
  const [loading,setLoading]=useState(true);
  const [open,setOpen]=useState(false);
  const [busy,setBusy]=useState(false);
  const [search,setSearch]=useState("");
  const [from,setFrom]=useState(today);
  const [to,setTo]=useState(today);
  const [form,setForm]=useState({description:"",category:"Rent",amount:"",expense_date:today});

  async function load(){
    setLoading(true);
    const {data,error}=await supabase.from("expenses").select("*")
      .gte("expense_date",from).lte("expense_date",to)
      .order("expense_date",{ascending:false}).order("created_at",{ascending:false});
    if(error) alert(error.message);
    else setExpenses(data||[]);
    setLoading(false);
  }
  useEffect(()=>{load()},[from,to]);

  const filtered=expenses.filter(e=>`${e.description} ${e.category||""}`.toLowerCase().includes(search.toLowerCase()));
  const total=filtered.reduce((s,e)=>s+Number(e.amount||0),0);

  function reset(){
    setForm({description:"",category:"Rent",amount:"",expense_date:today});
    setOpen(false);
  }

  async function save(){
    const amount=Number(form.amount);
    if(!form.description.trim()) return alert("Enter an expense description.");
    if(!Number.isFinite(amount)||amount<=0) return alert("Enter an expense amount greater than ₵0.00.");
    setBusy(true);
    const {data:{user}}=await supabase.auth.getUser();
    const {error}=await supabase.from("expenses").insert({
      description:form.description.trim(),
      category:form.category,
      amount,
      expense_date:form.expense_date,
      created_by:user?.id||null
    });
    setBusy(false);
    if(error) return alert(error.message);
    reset();
    await load();
  }

  async function removeExpense(id){
    if(!confirm("Delete this expense? This cannot be undone.")) return;
    const {error}=await supabase.from("expenses").delete().eq("id",id);
    if(error) alert(error.message); else load();
  }

  return <section className="content">
    <div className="section-head">
      <div><h2>Expenses</h2><p>Record shop expenses and include them in net profit.</p></div>
      <button className="primary" onClick={()=>setOpen(true)}><Plus size={17}/> Add Expense</button>
    </div>

    <div className="report-filters">
      <label>From<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
      <label>To<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
      <label className="filter-search">Search<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Description or category"/></label>
      <div className="filter-total"><span>Period expenses</span><strong>{money(total)}</strong></div>
    </div>

    <div className="table-panel">
      <table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Action</th></tr></thead><tbody>
        {loading && <tr><td colSpan="5" className="empty">Loading expenses...</td></tr>}
        {!loading && !filtered.length && <tr><td colSpan="5" className="empty">No expenses recorded for this period.</td></tr>}
        {!loading && filtered.map(e=><tr key={e.id}>
          <td>{new Date(`${e.expense_date}T00:00:00`).toLocaleDateString("en-GH")}</td>
          <td><b>{e.description}</b></td>
          <td><span className="badge neutral">{e.category||"Other"}</span></td>
          <td><strong>{money(e.amount)}</strong></td>
          <td><button className="table-action danger-action" onClick={()=>removeExpense(e.id)}>Delete</button></td>
        </tr>)}
      </tbody></table>
    </div>

    {open&&<Modal title="Add Expense" close={reset}>
      <div className="form-grid two">
        <label>Description<input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="e.g. Shop electricity"/></label>
        <label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
          {["Rent","Electricity","Internet","Transport","Salaries","Repairs","Supplies","Marketing","Bank Charges","Other"].map(x=><option key={x}>{x}</option>)}
        </select></label>
        <label>Amount (GHS)<input type="number" min="0.01" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0.00"/></label>
        <label>Expense date<input type="date" value={form.expense_date} onChange={e=>setForm({...form,expense_date:e.target.value})}/></label>
      </div>
      <button className="primary full" disabled={busy} onClick={save}>{busy?<><LoaderCircle size={16} className="spin"/> Saving...</>:"Save Expense"}</button>
    </Modal>}
  </section>
}

function Reports(){
  const today=new Date();
  const iso=d=>d.toISOString().slice(0,10);
  const [from,setFrom]=useState(iso(new Date(today.getFullYear(),today.getMonth(),1)));
  const [to,setTo]=useState(iso(today));
  const [loading,setLoading]=useState(true);
  const [sales,setSales]=useState([]);
  const [items,setItems]=useState([]);
  const [products,setProducts]=useState([]);
  const [phones,setPhones]=useState([]);
  const [expenses,setExpenses]=useState([]);
  const [repairs,setRepairs]=useState([]);
  const [returns,setReturns]=useState([]);
  const [returnItems,setReturnItems]=useState([]);
  const [profiles,setProfiles]=useState([]);

  async function load(){
    setLoading(true);
    const end=new Date(`${to}T00:00:00`); end.setDate(end.getDate()+1);
    const endIso=iso(end);
    const [salesRes,productsRes,phonesRes,expenseRes,repairRes,returnRes,profilesRes]=await Promise.all([
      supabase.from("sales").select("id,receipt_no,total,amount_paid,balance_due,payment_method,cashier_id,created_at").gte("created_at",`${from}T00:00:00`).lt("created_at",`${endIso}T00:00:00`).order("created_at",{ascending:false}),
      supabase.from("products").select("id,name,cost,stock,category"),
      supabase.from("phone_units").select("id,sale_id,imei_1,imei_2,brand,model,cost,status"),
      supabase.from("expenses").select("id,description,category,amount,expense_date").gte("expense_date",from).lte("expense_date",to),
      supabase.from("repairs").select("id,customer_id,device,repair_cost,amount_paid,balance_due,status,created_at").gte("created_at",`${from}T00:00:00`).lt("created_at",`${endIso}T00:00:00`),
      supabase.from("sale_returns").select("id,sale_id,refund_total,cash_refund,credit_reversal,refund_method,refund_reference,reason,created_at").gte("created_at",`${from}T00:00:00`).lt("created_at",`${endIso}T00:00:00`).order("created_at",{ascending:false}),
      supabase.from("profiles").select("id,full_name,role")
    ]);
    const salesRows=salesRes.data||[];
    const saleIds=salesRows.map(s=>s.id);
    let itemsRes={data:[],error:null};
    if(saleIds.length) itemsRes=await supabase.from("sale_items").select("id,sale_id,product_id,product_name,imei,quantity,unit_price,line_total,unit_cost").in("sale_id",saleIds);
    const returnRows=returnRes.data||[];
    const returnIds=returnRows.map(r=>r.id);
    let returnItemsRes={data:[],error:null};
    if(returnIds.length) returnItemsRes=await supabase.from("sale_return_items").select("id,return_id,sale_item_id,product_id,product_name,imei,quantity,unit_price,line_total").in("return_id",returnIds);
    const returnSaleItemIds=(returnItemsRes.data||[]).map(x=>x.sale_item_id).filter(Boolean);
    let returnSourceItemsRes={data:[],error:null};
    if(returnSaleItemIds.length) returnSourceItemsRes=await supabase.from("sale_items").select("id,sale_id,product_id,product_name,imei,quantity,unit_price,line_total,unit_cost").in("id",returnSaleItemIds);
    const firstErr=[salesRes,itemsRes,productsRes,phonesRes,expenseRes,repairRes,returnRes,returnItemsRes,returnSourceItemsRes,profilesRes].find(r=>r.error);
    if(firstErr) alert(firstErr.error.message);
    setSales(salesRows); setItems([...(itemsRes.data||[]), ...(returnSourceItemsRes.data||[])].filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i)); setProducts(productsRes.data||[]); setPhones(phonesRes.data||[]);
    setExpenses(expenseRes.data||[]); setRepairs(repairRes.data||[]); setReturns(returnRows); setReturnItems(returnItemsRes.data||[]); setProfiles(profilesRes.data||[]);
    setLoading(false);
  }
  useEffect(()=>{load()},[from,to]);

  const productCost=new Map(products.map(p=>[String(p.id),Number(p.cost||0)]));
  const phoneCost=new Map();
  phones.forEach(p=>{
    if(p.imei_1) phoneCost.set(String(p.imei_1),Number(p.cost||0));
    if(p.imei_2) phoneCost.set(String(p.imei_2),Number(p.cost||0));
  });
  const itemCost=i=>{
    const saved=Number(i.unit_cost||0);
    if(saved>0) return saved;
    return i.imei ? (phoneCost.get(String(i.imei))||0) : (productCost.get(String(i.product_id))||0);
  };
  const itemProfit=i=>Number(i.line_total||0)-(Number(i.quantity||0)*itemCost(i));
  const salesTotal=sales.reduce((s,x)=>s+Number(x.total||0),0);
  const collected=sales.reduce((s,x)=>s+Number(x.amount_paid||0),0);
  const outstanding=sales.reduce((s,x)=>s+Number(x.balance_due||0),0);
  const salesGrossProfit=items.reduce((s,i)=>s+itemProfit(i),0);

  const returnCostBySaleItem=new Map();
  returnItems.forEach(r=>{
    const source=items.find(i=>i.id===r.sale_item_id);
    const cost=source ? itemCost(source) : (r.imei ? (phoneCost.get(String(r.imei))||0) : (productCost.get(String(r.product_id))||0));
    returnCostBySaleItem.set(r.id,Number(r.quantity||0)*cost);
  });
  const returnTotal=returns.reduce((s,x)=>s+Number(x.refund_total||0),0);
  const returnedCost=returnItems.reduce((s,r)=>s+(returnCostBySaleItem.get(r.id)||0),0);
  const returnedGrossProfit=returnItems.reduce((s,r)=>s+Number(r.line_total||0)-(returnCostBySaleItem.get(r.id)||0),0);
  const grossProfitAfterReturns=salesGrossProfit-returnedGrossProfit;

  const expenseTotal=expenses.reduce((s,x)=>s+Number(x.amount||0),0);
  const repairRevenue=repairs.reduce((s,x)=>s+Number(x.repair_cost||0),0);
  const repairCollected=repairs.reduce((s,x)=>s+Number(x.amount_paid||0),0);
  const businessRevenue=salesTotal+repairRevenue-returnTotal;
  const netProfit=grossProfitAfterReturns+repairRevenue-expenseTotal;
  const margin=businessRevenue>0?(netProfit/businessRevenue)*100:0;
  // Net collected is actual money received minus actual money refunded.
  // Credit reversals are not cash refunds because that money was never collected.
  const cashRefundTotal=returns.reduce((s,r)=>s+Number(r.cash_refund ?? (r.refund_method==="Credit Reversal" ? 0 : r.refund_total) ?? 0),0);
  const netCollected=collected+repairCollected-cashRefundTotal;

  const paymentTotals={};
  sales.forEach(s=>paymentTotals[s.payment_method||"Unknown"]=(paymentTotals[s.payment_method||"Unknown"]||0)+Number(s.amount_paid||0));
  repairs.forEach(r=>paymentTotals["Repairs"]=(paymentTotals["Repairs"]||0)+Number(r.amount_paid||0));

  const bestMap=new Map();
  items.forEach(i=>{
    const k=i.product_name||"Unknown"; const cur=bestMap.get(k)||{name:k,qty:0,revenue:0,profit:0};
    cur.qty+=Number(i.quantity||0); cur.revenue+=Number(i.line_total||0); cur.profit+=itemProfit(i); bestMap.set(k,cur);
  });
  returnItems.forEach(r=>{
    const cur=bestMap.get(r.product_name);
    if(cur){ cur.qty-=Number(r.quantity||0); cur.revenue-=Number(r.line_total||0); cur.profit-=Number(r.line_total||0)-(returnCostBySaleItem.get(r.id)||0); }
  });
  const bestSellers=[...bestMap.values()].filter(x=>x.qty>0||x.revenue>0).sort((a,b)=>b.revenue-a.revenue).slice(0,8);

  const cashierMap=new Map();
  sales.forEach(s=>{
    const p=profiles.find(x=>x.id===s.cashier_id); const name=p?.full_name||"Unknown cashier";
    const cur=cashierMap.get(name)||{name,sales:0,collected:0,profit:0,count:0};
    cur.sales+=Number(s.total||0); cur.collected+=Number(s.amount_paid||0); cur.profit+=items.filter(i=>i.sale_id===s.id).reduce((n,i)=>n+itemProfit(i),0); cur.count++;
    cashierMap.set(name,cur);
  });
  const cashierRows=[...cashierMap.values()].sort((a,b)=>b.sales-a.sales);

  const dayMap=new Map();
  const dayProfit=new Map();
  sales.forEach(s=>{
    const day=new Date(s.created_at).toLocaleDateString("en-GH",{day:"2-digit",month:"short"});
    dayMap.set(day,(dayMap.get(day)||0)+Number(s.total||0));
  });
  items.forEach(i=>{
    const sale=sales.find(s=>s.id===i.sale_id); if(!sale) return;
    const day=new Date(sale.created_at).toLocaleDateString("en-GH",{day:"2-digit",month:"short"});
    dayProfit.set(day,(dayProfit.get(day)||0)+itemProfit(i));
  });
  returns.forEach(r=>{
    const day=new Date(r.created_at).toLocaleDateString("en-GH",{day:"2-digit",month:"short"});
    dayMap.set(day,(dayMap.get(day)||0)-Number(r.refund_total||0));
    const ri=returnItems.filter(x=>x.return_id===r.id);
    const rp=ri.reduce((n,x)=>n+Number(x.line_total||0)-((returnCostBySaleItem.get(x.id)||0)),0);
    dayProfit.set(day,(dayProfit.get(day)||0)-rp);
  });
  const days=[...new Set([...dayMap.keys(),...dayProfit.keys()])].slice(-14);

  const inventoryCost=products.reduce((s,p)=>s+Number(p.cost||0)*Number(p.stock||0),0)+phones.filter(p=>p.status==="In Stock").reduce((s,p)=>s+Number(p.cost||0),0);
  const lowStock=products.filter(p=>Number(p.stock||0)<=10).sort((a,b)=>Number(a.stock||0)-Number(b.stock||0)).slice(0,8);
  const phoneSaleIds=new Set(phones.filter(p=>p.sale_id!=null).map(p=>String(p.sale_id)));
  const phoneRevenue=items.filter(i=>phoneSaleIds.has(String(i.sale_id))).reduce((s,i)=>s+Number(i.line_total||0),0);
  const accessoryRevenue=items.filter(i=>!phoneSaleIds.has(String(i.sale_id))).reduce((s,i)=>s+Number(i.line_total||0),0);
  const phoneUnitsSold=items.filter(i=>phoneSaleIds.has(String(i.sale_id))).reduce((s,i)=>s+Number(i.quantity||0),0);
  const accessoryUnitsSold=items.filter(i=>!phoneSaleIds.has(String(i.sale_id))).reduce((s,i)=>s+Number(i.quantity||0),0);
  const repairStatusMap={}; repairs.forEach(r=>{const k=r.status||"Unknown"; repairStatusMap[k]=(repairStatusMap[k]||0)+1});
  const repairStatusRows=Object.entries(repairStatusMap).sort((a,b)=>b[1]-a[1]);
  const returnByMethod={}; returns.forEach(r=>{const k=r.refund_method||"Unknown"; returnByMethod[k]=(returnByMethod[k]||0)+Number(r.refund_total||0)});
  const expenseByCategory=[...expenses.reduce((m,e)=>{const k=e.category||"Other";m.set(k,(m.get(k)||0)+Number(e.amount||0));return m},new Map())].sort((a,b)=>b[1]-a[1]);
  const maxPayment=Math.max(...Object.values(paymentTotals),1);
  const maxExpense=Math.max(...expenseByCategory.map(x=>x[1]),1);
  const maxCashier=Math.max(...cashierRows.map(x=>x.sales),1);

  function csvCell(v){return `"${String(v??"").replace(/"/g,'""')}"`;}
  function exportCSV(){
    const rows=[
      ["G-LOKOO PHONES AND ACCESSORIES"],["Business Report",`${from} to ${to}`],[],
      ["Metric","Amount"],
      ["Sales Revenue",salesTotal],["Repair Revenue",repairRevenue],["Returns & Refunds",returnTotal],["Net Business Revenue",businessRevenue],
      ["Sales Gross Profit",salesGrossProfit],["Returned Gross Profit Reversal",returnedGrossProfit],["Gross Profit After Returns",grossProfitAfterReturns],
      ["Expenses",expenseTotal],["Net Profit",netProfit],["Profit Margin %",margin.toFixed(2)],
      ["Sales Collected",collected],["Repair Collected",repairCollected],["Cash Refunds Paid",cashRefundTotal],["Credit Reversals",Math.max(0,returnTotal-cashRefundTotal)],["Net Collected",netCollected],["Outstanding Credit",outstanding],[],
      ["Best Sellers","Units","Revenue","Profit"],...bestSellers.map(x=>[x.name,x.qty,x.revenue,x.profit]),[],
      ["Cashier Performance","Sales","Collected","Profit","Transactions"],...cashierRows.map(x=>[x.name,x.sales,x.collected,x.profit,x.count]),[],
      ["Expenses by Category","Amount"],...expenseByCategory.map(([k,v])=>[k,v]),[],
      ["Returns","Sale ID","Refund","Method","Reason","Date"],...returns.map(r=>[r.id,r.sale_id,r.refund_total,r.refund_method,r.reason||"",new Date(r.created_at).toLocaleString("en-GH")])
    ];
    const blob=new Blob([rows.map(r=>r.map(csvCell).join(",")).join("\n")],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`g-lokoo-report-${from}-to-${to}.csv`;a.click();URL.revokeObjectURL(url);
  }
  function printReport(){window.print();}

  return <section className="content reports-page">
    <div className="section-head report-print-hide">
      <div><h2>Reports 2.4</h2><p>Reconciled sales, profit, payments, stock, repairs, returns and expenses.</p></div>
      <div className="report-actions"><button className="secondary" onClick={printReport}><ReceiptText size={16}/> Print / PDF</button><button className="primary" onClick={exportCSV}><Download size={16}/> Export CSV</button><button className="secondary" onClick={load}><ReceiptText size={16}/> Refresh</button></div>
    </div>

    <div className="report-filters report-print-hide">
      <label>From<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
      <label>To<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
      <div className="quick-filters">
        <button onClick={()=>{const d=new Date();setFrom(iso(d));setTo(iso(d))}}>Today</button>
        <button onClick={()=>{const d=new Date();const s=new Date(d);s.setDate(s.getDate()-6);setFrom(iso(s));setTo(iso(d))}}>7 Days</button>
        <button onClick={()=>{const d=new Date();const s=new Date(d);s.setDate(s.getDate()-29);setFrom(iso(s));setTo(iso(d))}}>30 Days</button>
        <button onClick={()=>{const d=new Date();setFrom(iso(new Date(d.getFullYear(),d.getMonth(),1)));setTo(iso(d))}}>This Month</button>
      </div>
    </div>

    <div className="print-report-header"><h1>G-LOKOO PHONES AND ACCESSORIES</h1><p>Business Report · {from} to {to}</p></div>

    {loading?<div className="empty-panel"><LoaderCircle size={35} className="spin"/><h3>Loading reports...</h3></div>:
    <>
      <div className="stats report-stats">
        <Stat label="Sales Revenue" value={money(salesTotal)} icon={ShoppingCart}/><Stat label="Repair Revenue" value={money(repairRevenue)} icon={Wrench}/><Stat label="Returns & Refunds" value={money(returnTotal)} icon={Undo2}/><Stat label="Net Revenue" value={money(businessRevenue)} icon={BarChart3}/>
        <Stat label="Gross Profit After Returns" value={money(grossProfitAfterReturns)} icon={BarChart3}/><Stat label="Net Profit" value={money(netProfit)} icon={BarChart3}/><Stat label="Net Collected" value={money(netCollected)} icon={Banknote}/><Stat label="Outstanding Credit" value={money(outstanding)} icon={CreditCard}/>
      </div>

      <div className="profit-banner"><div><span>NET BUSINESS PROFIT</span><strong className={netProfit>=0?"profit-positive":"profit-negative"}>{money(netProfit)}</strong><small>{margin.toFixed(1)}% margin · sales profit adjusted for returns + repair revenue − expenses</small></div><div className="profit-side"><span>Inventory Cost Value</span><b>{money(inventoryCost)}</b><small>{products.length} product records + {phones.filter(p=>p.status==="In Stock").length} phones in stock</small></div></div>

      <div className="reconciliation-strip"><div><span>Sales revenue</span><b>{money(salesTotal)}</b></div><div className="minus"><span>Returns</span><b>− {money(returnTotal)}</b></div><div><span>Repair revenue</span><b>+ {money(repairRevenue)}</b></div><div className="total"><span>Net business revenue</span><b>{money(businessRevenue)}</b></div></div>

      <div className="grid2">
        <div className="panel"><div className="panel-title"><h3>Sales & Profit Trend</h3><span>Last {days.length} day(s)</span></div>{days.length?<div className="report-trend">{days.map(day=>{const sv=Math.max(0,dayMap.get(day)||0),pv=dayProfit.get(day)||0,max=Math.max(...days.map(d=>Math.max(dayMap.get(d)||0,Math.abs(dayProfit.get(d)||0))),1);return <div className="trend-day" key={day}><div className="trend-bars"><div className="trend-bar sales-bar" style={{height:`${Math.max(4,sv/max*100)}%`}} title={`Net sales ${money(sv)}`}></div><div className={`trend-bar profit-bar ${pv<0?"negative-profit-bar":""}`} style={{height:`${Math.max(4,Math.abs(pv)/max*100)}%`}} title={`Profit ${money(pv)}`}></div></div><small>{day}</small></div>})}</div>:<div className="empty">No activity in this period.</div>}<div className="chart-legend"><span><i className="legend-sales"/>Net sales</span><span><i className="legend-profit"/>Profit</span></div></div>
        <div className="panel"><div className="panel-title"><h3>Payment Methods</h3><span>Collected</span></div>{Object.keys(paymentTotals).length?Object.entries(paymentTotals).sort((a,b)=>b[1]-a[1]).map(([method,val])=><div className="report-row payment-row" key={method}><span><b>{method}</b><small className="report-meter"><i style={{width:`${Math.max(3,val/maxPayment*100)}%`}}/></small></span><strong>{money(val)}</strong></div>):<div className="empty">No payments recorded.</div>}</div>
      </div>

      <div className="grid3 report-lower">
        <div className="panel"><div className="panel-title"><h3>Sales Mix</h3><span>Before returns</span></div><div className="mix-card"><div><span>Phones</span><b>{money(phoneRevenue)}</b><small>{phoneUnitsSold} unit(s)</small></div><div><span>Accessories</span><b>{money(accessoryRevenue)}</b><small>{accessoryUnitsSold} unit(s)</small></div></div><div className="mix-bar"><i style={{width:`${salesTotal?Math.min(100,phoneRevenue/salesTotal*100):0}%`}}/></div></div>
        <div className="panel"><div className="panel-title"><h3>Repair Performance</h3><span>{repairs.length} job(s)</span></div>{repairStatusRows.length?repairStatusRows.map(([status,count])=><div className="report-row" key={status}><span>{status}</span><strong>{count}</strong></div>):<div className="empty">No repairs in this period.</div>}<div className="mini-total"><span>Collected</span><b>{money(repairCollected)}</b></div></div>
        <div className="panel"><div className="panel-title"><h3>Returns & Refunds</h3><span>{returns.length} return(s)</span></div>{returns.length?Object.entries(returnByMethod).sort((a,b)=>b[1]-a[1]).map(([method,val])=><div className="report-row" key={method}><span>{method}</span><strong>{money(val)}</strong></div>):<div className="empty">No returns recorded.</div>}<div className="mini-total"><span>Refunded</span><b>{money(returnTotal)}</b></div></div>
      </div>

      <div className="grid2 report-lower">
        <div className="panel"><div className="panel-title"><h3>Best Sellers</h3><span>Net units & profit</span></div>{bestSellers.length?bestSellers.map((x,i)=><div className="report-row" key={x.name}><span><b>#{i+1} {x.name}</b><small>{x.qty} net unit(s) · Profit {money(x.profit)}</small></span><strong>{money(x.revenue)}</strong></div>):<div className="empty">No product sales yet.</div>}</div>
        <div className="panel"><div className="panel-title"><h3>Expense Breakdown</h3><span>Selected period</span></div>{expenses.length?expenseByCategory.map(([cat,val])=><div className="report-row expense-row" key={cat}><span><b>{cat}</b><small className="report-meter"><i style={{width:`${Math.max(3,val/maxExpense*100)}%`}}/></small></span><strong>{money(val)}</strong></div>):<div className="empty">No expenses recorded.</div>}</div>
      </div>

      <div className="grid2 report-lower">
        <div className="panel"><div className="panel-title"><h3>Cashier Performance</h3><span>Owner/Admin</span></div>{cashierRows.length?cashierRows.map(x=><div className="report-row" key={x.name}><span><b>{x.name}</b><small>{x.count} transaction(s) · Collected {money(x.collected)} · Profit {money(x.profit)}</small><small className="report-meter"><i style={{width:`${Math.max(3,x.sales/maxCashier*100)}%`}}/></small></span><strong>{money(x.sales)}</strong></div>):<div className="empty">No cashier sales in this period.</div>}</div>
        <div className="panel"><div className="panel-title"><h3>Inventory Alerts</h3><span>{lowStock.length} low-stock item(s)</span></div>{lowStock.length?lowStock.map(p=><div className="report-row" key={p.id}><span><b>{p.name}</b><small>{p.category||"Product"}</small></span><strong className={Number(p.stock||0)<=0?"profit-negative":""}>{Number(p.stock||0)} left</strong></div>):<div className="empty">No low-stock products.</div>}</div>
      </div>

      <div className="panel report-lower"><div className="panel-title"><h3>Financial Reconciliation</h3><span>Selected period</span></div><div className="summary-grid"><div><span>Sales revenue</span><b>{money(salesTotal)}</b></div><div><span>Returns</span><b>− {money(returnTotal)}</b></div><div><span>Repair revenue</span><b>+ {money(repairRevenue)}</b></div><div><span>Net business revenue</span><b>{money(businessRevenue)}</b></div><div><span>Sales gross profit</span><b>{money(salesGrossProfit)}</b></div><div><span>Return profit reversal</span><b>− {money(returnedGrossProfit)}</b></div><div><span>Gross profit after returns</span><b>{money(grossProfitAfterReturns)}</b></div><div><span>Expenses</span><b>− {money(expenseTotal)}</b></div><div><span>Net profit</span><b className={netProfit>=0?"profit-positive":"profit-negative"}>{money(netProfit)}</b></div><div><span>Net collected</span><b>{money(netCollected)}</b></div><div><span>Outstanding credit</span><b>{money(outstanding)}</b></div><div><span>Inventory cost value</span><b>{money(inventoryCost)}</b></div></div></div>

      <div className="panel report-lower"><div className="panel-title"><h3>Detailed Sales Transactions</h3><span>{sales.length} transaction(s) · showing up to 50</span></div>{sales.length?<div className="report-table-wrap"><table className="report-table"><thead><tr><th>Receipt</th><th>Date</th><th>Cashier</th><th>Payment</th><th>Items</th><th>Total</th><th>Paid</th><th>Balance</th></tr></thead><tbody>{sales.slice(0,50).map(s=>{const p=profiles.find(x=>x.id===s.cashier_id);const saleItems=items.filter(i=>i.sale_id===s.id);const itemCount=saleItems.reduce((n,i)=>n+Number(i.quantity||0),0);return <tr key={s.id}><td><b>{s.receipt_no||s.id}</b></td><td>{new Date(s.created_at).toLocaleDateString('en-GH')}</td><td>{p?.full_name||'Unknown'}</td><td>{s.payment_method||'—'}</td><td>{itemCount}</td><td>{money(s.total)}</td><td>{money(s.amount_paid)}</td><td>{money(s.balance_due)}</td></tr>})}</tbody></table></div>:<div className="empty">No sales transactions in this period.</div>}</div>

      <div className="panel report-lower"><div className="panel-title"><h3>Returns Detail</h3><span>{returns.length} return(s)</span></div>{returns.length?<div className="report-table-wrap"><table className="report-table"><thead><tr><th>Return</th><th>Sale</th><th>Date</th><th>Method</th><th>Reason</th><th>Refund</th></tr></thead><tbody>{returns.map(r=><tr key={r.id}><td><b>RET-{r.id}</b></td><td>{r.sale_id}</td><td>{new Date(r.created_at).toLocaleDateString('en-GH')}</td><td>{r.refund_method||'—'}</td><td>{r.reason||'—'}</td><td>{money(r.refund_total)}</td></tr>)}</tbody></table></div>:<div className="empty">No returns in this period.</div>}</div>

      <div className="panel report-lower"><div className="panel-title"><h3>Product Performance Detail</h3><span>{bestSellers.length} product(s)</span></div>{bestSellers.length?<div className="report-table-wrap"><table className="report-table"><thead><tr><th>Product</th><th>Net Units</th><th>Net Revenue</th><th>Net Cost</th><th>Net Profit</th><th>Margin</th></tr></thead><tbody>{bestSellers.map(x=>{const cost=x.revenue-x.profit;const pm=x.revenue>0?(x.profit/x.revenue)*100:0;return <tr key={x.name}><td><b>{x.name}</b></td><td>{x.qty}</td><td>{money(x.revenue)}</td><td>{money(cost)}</td><td>{money(x.profit)}</td><td>{pm.toFixed(1)}%</td></tr>})}</tbody></table></div>:<div className="empty">No product sales in this period.</div>}</div>
    </>}
  </section>
}
function SettingsPage({settings,reload}){
  const defaults={
    shop_name:"G-LOKOO PHONES AND ACCESSORIES",
    shop_subtitle:"PHONES AND ACCESSORIES",
    phone_primary:"0247917685",
    phone_secondary:"050006067",
    address:"",
    receipt_footer:"Thank you for shopping with G-LOKOO!",
    receipt_note:"Please keep this receipt for your records.",
    low_stock_threshold:10,
    receipt_width:"80mm",
    printer_name:"",
    auto_print:false
  };
  const [form,setForm]=useState({...defaults,...(settings||{})});
  const [busy,setBusy]=useState(false);
  const [saved,setSaved]=useState(false);

  useEffect(()=>{setForm({...defaults,...(settings||{})})},[settings]);

  async function save(){
    if(!form.shop_name.trim()) return alert("Enter the shop name.");
    const threshold=Number(form.low_stock_threshold);
    if(!Number.isInteger(threshold)||threshold<0||threshold>999) return alert("Low-stock threshold must be a whole number from 0 to 999.");
    setBusy(true); setSaved(false);
    const {data:{user}}=await supabase.auth.getUser();
    const payload={
      id:1,
      shop_name:form.shop_name.trim(),
      shop_subtitle:form.shop_subtitle.trim(),
      phone_primary:form.phone_primary.trim(),
      phone_secondary:form.phone_secondary.trim(),
      address:form.address.trim(),
      receipt_footer:form.receipt_footer.trim(),
      receipt_note:form.receipt_note.trim(),
      low_stock_threshold:threshold,
      receipt_width:form.receipt_width,
      printer_name:form.printer_name.trim(),
      auto_print:!!form.auto_print,
      updated_by:user?.id||null,
      updated_at:new Date().toISOString()
    };
    const {error}=await supabase.from("shop_settings").upsert(payload,{onConflict:"id"});
    setBusy(false);
    if(error) alert(error.message);
    else { setSaved(true); await reload(); setTimeout(()=>setSaved(false),2500); }
  }

  return <section className="content">
    <div className="section-head">
      <div><h2>Settings</h2><p>Manage shop identity, receipts, stock alerts and printer preferences.</p></div>
      <button className="primary" disabled={busy} onClick={save}>{busy?<><LoaderCircle size={16} className="spin"/> Saving...</>:<>Save Settings</>}</button>
    </div>

    {saved&&<div className="settings-saved"><CheckCircle2 size={17}/> Settings saved successfully.</div>}

    <div className="settings-grid">
      <div className="panel settings-card">
        <div className="settings-card-head"><div className="settings-icon"><Settings size={18}/></div><div><h3>Shop Information</h3><p>Details shown throughout the POS and on receipts.</p></div></div>
        <div className="form-grid-2">
          <label>Shop name*<input value={form.shop_name} onChange={e=>setForm({...form,shop_name:e.target.value})}/></label>
          <label>Subtitle<input value={form.shop_subtitle} onChange={e=>setForm({...form,shop_subtitle:e.target.value})}/></label>
          <label>Primary phone<input value={form.phone_primary} onChange={e=>setForm({...form,phone_primary:e.target.value})}/></label>
          <label>Secondary phone<input value={form.phone_secondary} onChange={e=>setForm({...form,phone_secondary:e.target.value})}/></label>
        </div>
        <label>Shop address<input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Optional shop address"/></label>
      </div>

      <div className="panel settings-card">
        <div className="settings-card-head"><div className="settings-icon"><ReceiptText size={18}/></div><div><h3>Receipt Settings</h3><p>Customize the printed thermal receipt.</p></div></div>
        <div className="form-grid-2">
          <label>Receipt paper width<select value={form.receipt_width} onChange={e=>setForm({...form,receipt_width:e.target.value})}><option>80mm</option><option>58mm</option></select></label>
          <label>Printer name<input value={form.printer_name} onChange={e=>setForm({...form,printer_name:e.target.value})} placeholder="Optional printer name"/></label>
        </div>
        <label>Receipt footer<input value={form.receipt_footer} onChange={e=>setForm({...form,receipt_footer:e.target.value})}/></label>
        <label>Receipt note<input value={form.receipt_note} onChange={e=>setForm({...form,receipt_note:e.target.value})}/></label>
        <label className="settings-toggle"><input type="checkbox" checked={!!form.auto_print} onChange={e=>setForm({...form,auto_print:e.target.checked})}/><span><b>Auto-print after sale</b><small>Your browser may still require print permission; the POS cannot silently bypass browser print security.</small></span></label>
      </div>

      <div className="panel settings-card">
        <div className="settings-card-head"><div className="settings-icon"><Package size={18}/></div><div><h3>Inventory Alerts</h3><p>Control when products appear as low stock.</p></div></div>
        <label>Low-stock threshold<input type="number" min="0" max="999" step="1" value={form.low_stock_threshold} onChange={e=>setForm({...form,low_stock_threshold:e.target.value})}/></label>
        <div className="settings-info"><b>Current rule</b><span>Accessories with stock at or below <strong>{Number(form.low_stock_threshold||0)}</strong> will be treated as low stock.</span></div>
      </div>

      <div className="panel settings-card">
        <div className="settings-card-head"><div className="settings-icon"><CreditCard size={18}/></div><div><h3>Currency & Payments</h3><p>Ghana shop payment configuration.</p></div></div>
        <div className="settings-fixed-row"><span>Currency</span><strong>GHS · ₵</strong></div>
        <div className="settings-info"><b>Supported payment methods</b><span>Cash · MTN MoMo · Telecel Cash · AirtelTigo Money · Bank Transfer · Card · Credit</span></div>
      </div>
    </div>

    <div className="settings-security"><ShieldCheck size={18}/><div><b>Management-only settings</b><span>Only Owner and Admin accounts can change shop configuration. New settings are stored in Supabase and shared across POS devices.</span></div></div>
  </section>
}

function EmptyPage({title}){return <section className="content"><div className="empty-panel"><Settings size={45}/><h2>{title}</h2><p>This module is prepared for the next development phase.</p></div></section>}
function Modal({title,close,children}){return <div className="modal-bg"><div className="modal"><div className="modal-head"><h3>{title}</h3><button onClick={close}><X/></button></div>{children}</div></div>}

createRoot(document.getElementById("root")).render(<App/>);
