// All records are deterministic, synthetic, and generated locally. No network calls.
export const DAY=86400000, BASE=Date.UTC(2026,6,24);
export const date=d=>new Date(BASE+d*DAY).toISOString().slice(0,10);
export const lastDay=89;
const rand=()=>{let s=20261022;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;}};
export function generate(scenario='normal'){
 const r=rand(),users=[],events=[],tasks=[],orders=[];let seq=0;
 for(let i=0;i<420;i++){
  const joined=Math.floor(r()*90),platform=r()<.69?'iOS':'Android',u={id:'SIM-'+String(i+1).padStart(4,'0'),joined,platform,cohort:r()<.55?'规律回访':'偶尔回访'}; users.push(u);
  for(let d=joined;d<90;d++){
   let prob=u.cohort==='规律回访'?.31:.11;if(d===joined)prob=1;if(scenario==='traffic'&&d>=83)prob=Math.min(1,prob*1.7);
   if(r()>prob)continue;
   const e={id:'E'+(++seq),uid:u.id,d,platform,type:d===joined?'新用户':'老用户',core:false,mode:'内容回访',action:false,portrait:false,old:false,feedback:null,exposed:false,checkout:false,quota:false,onboarding:false};
   const hasContent=tasks.some(t=>t.uid===u.id&&t.d<d&&t.viewed);
   if(d===joined)e.onboarding=false;
   let coreChance=scenario==='traffic'&&d>=83?.35:.72;
   let wants=r()<coreChance;
   if(wants&&r()<.62){
    if(d===joined)e.onboarding=true;
    const mode=d===joined?'首次分析':r()<.55?'每日生成':r()<.5?'每日更新':'正式分析';e.mode=mode;
    const quota=r()<(scenario==='quota'&&d>=83?.36:.055);e.quota=quota;
    const accepted=!quota&&r()>.04;
    const status=!accepted?(quota?'额度不足':'材料校验'):r()<.055?'安全支持':r()<(scenario==='delivery'&&d>=83?.32:.045)?'技术失败':'普通结果';
    const viewed=status==='普通结果'&&r()>(scenario==='delivery'&&d>=83?.28:.09);
    const t={id:'T'+seq,uid:u.id,d,platform,mode,type:e.type,accepted,status,viewed,minutes:Math.round((1+r()*5+(scenario==='delivery'&&d>=83?8:0))*10)/10,retries:r()<.12?1:0,cost:Math.round((.08+r()*.43)*100)/100,costKnown:r()>.12};tasks.push(t);
    if(viewed){e.core=true;e.exposed=r()<.71;if(e.exposed&&r()<.3)e.feedback=r()<.81?'赞':'踩';}
   }else if(wants&&hasContent){e.old=r()<.65;e.action=r()<.48;e.portrait=d-joined>=7&&(!e.old&&!e.action||r()<.22);e.core=e.old||e.action||e.portrait;}
   e.actionDone=e.action&&r()<.22;e.checkout=r()<(e.quota?.72:.12);events.push(e);
   if(e.checkout&&platform==='iOS'){
    let paid=r()<.46;orders.push({id:'O'+seq,uid:u.id,d,platform,type:e.type,product:r()<.65?'月度会员':'正式分析5次',amount:0,paid,granted:paid&&r()<.97,refunded:paid&&r()<.045,refundD:Math.min(89,d+3+Math.floor(r()*12)),mode:'商品购买'});const o=orders.at(-1);o.amount=o.product==='月度会员'?29:39;
   }
  }
 }
 return{users,events,tasks,orders,scenario};
}
const uniq=rows=>[...new Set(rows.map(x=>x.uid))];
const count=(rows,kind='users')=>kind==='users'?uniq(rows).length:rows.length;
export function calculate(db,key,end=89,platform='全部'){
 const window=rows=>rows.filter(x=>x.d<=end&&x.d>=end-6&&(platform==='全部'||x.platform===platform));
 const es=window(db.events),ts=window(db.tasks),os=window(db.orders),us=db.users.filter(u=>u.joined<=end&&(platform==='全部'||u.platform===platform));
 let num=[],den=[],kind='users',unit='人',value=0,mode='count',note='',group='platform';
 const ratio=(n,d,k='users')=>{num=n;den=d;kind=k;unit='%';mode='ratio';};
 switch(key){
 case'NS01':num=es.filter(e=>e.core);break;
 case'U02':num=es;break;
 case'NS02':ratio(es.filter(e=>e.core),es);break;
 case'U01':num=es.filter(e=>e.d===end);break;
 case'U03':ratio(es.filter(e=>e.d===end),db.events.filter(e=>e.d<=end&&e.d>=end-29&&(platform==='全部'||e.platform===platform)));break;
 case'new':num=es.filter(e=>db.users.find(u=>u.id===e.uid).joined>=end-6);break;
 case'retained':{const prev=new Set(db.events.filter(e=>e.d>=end-13&&e.d<=end-7).map(e=>e.uid));num=es.filter(e=>prev.has(e.uid));break;}
 case'return':{const prev=new Set(db.events.filter(e=>e.d>=end-13&&e.d<=end-7).map(e=>e.uid));num=es.filter(e=>!prev.has(e.uid)&&db.users.find(u=>u.id===e.uid).joined<end-6);break;}
 case'U06':{const c=us.filter(u=>u.joined<=end-7&&u.joined>=end-34);den=c.map(u=>({uid:u.id,d:u.joined,platform:u.platform,type:'首活批次'}));num=den.filter(u=>db.events.some(e=>e.uid===u.uid&&e.d===u.d+7));ratio(num,den);note='首活日位于截止日前34至7日，已满D7观察窗';break;}
 case'U07':{const c=us.filter(u=>u.joined<=end-7&&u.joined>=end-34);den=c.map(u=>({uid:u.id,d:u.joined,platform:u.platform,type:'首活批次'}));num=den.filter(u=>db.events.some(e=>e.uid===u.uid&&e.d>u.d&&e.d<=u.d+7));ratio(num,den);note='同一成熟首活批次，D1—D7任一天回来';break;}
 case'U05':{const ids=uniq(es);num=ids.map(uid=>{let days=0;while(db.events.some(e=>e.uid===uid&&e.d===end-days))days++;return{uid,days,d:end,platform:us.find(u=>u.id===uid).platform,type:days>=3?'连续3天及以上':'不足3天'};});ratio(num.filter(e=>e.days>=3),num);note='本周活跃用户中，截至截止日连续活跃至少3天';break;}
 case'U09':{const submitted=new Set(ts.map(t=>t.uid));ratio(es.filter(e=>!submitted.has(e.uid)),es);note='本原型为周口径，不是字典中的每日口径';break;}
 case'result':num=ts.filter(t=>t.viewed);break;
 case'U10':num=es.filter(e=>e.old);break;
 case'portrait':num=es.filter(e=>e.portrait);break;
 case'action':num=es.filter(e=>e.action);break;
 case'F01':num=es.filter(e=>e.type==='新用户');break;
 case'F04':{den=es.filter(e=>e.type==='新用户'&&e.d<end);ratio(den.filter(e=>e.onboarding),den);note='成熟新用户，注册日内完成首次提交；模拟中完成均发生当日';break;}
 case'D01':num=ts;break;
 case'D02':ratio(ts.filter(t=>t.accepted),ts,'records');group='mode';break;
 case'D04':ratio(ts.filter(t=>t.status==='普通结果'),ts.filter(t=>t.accepted),'records');group='mode';break;
 case'D07':ratio(ts.filter(t=>t.viewed),ts.filter(t=>t.status==='普通结果'),'records');group='mode';break;
 case'D05':num=ts.filter(t=>t.status==='普通结果');kind='records';mode='median';unit='分钟';group='mode';break;
 case'failure':num=ts.filter(t=>t.status==='技术失败');kind='records';unit='次';group='mode';break;
 case'quota':num=ts.filter(t=>t.status==='额度不足');kind='records';unit='次';break;
 case'safety':num=ts.filter(t=>t.status==='安全支持');kind='records';unit='次';group='mode';break;
 case'V02':ratio(es.filter(e=>e.feedback),es.filter(e=>e.exposed),'records');note='发生期快照，尚未冻结7天反馈窗口；不作为成熟cohort值';break;
 case'V03':ratio(es.filter(e=>e.feedback==='赞'),es.filter(e=>e.feedback),'records');note='发生期反馈快照，每用户每天最多一个结果；不是全部用户满意率';break;
 case'V05':num=es.filter(e=>e.feedback==='踩');kind='records';unit='份';break;
 case'actionDone':num=es.filter(e=>e.actionDone);kind='records';unit='次';break;
 case'Q06':num=ts.filter(t=>t.accepted&&t.costKnown);kind='records';mode='average';unit='元';note='模拟任务已包含重试成本；未知成本不补0，不等于真实账单';group='mode';break;
 case'Q07':ratio(ts.filter(t=>t.accepted&&t.costKnown),ts.filter(t=>t.accepted),'records');group='mode';break;
 case'B01':num=es.filter(e=>e.checkout);break;
 case'B04':ratio(os.filter(o=>o.paid),os,'records');note='模拟中订单均在创建当日终结；取消及未支付保留分母';break;
 case'B05':ratio(os.filter(o=>o.granted),os.filter(o=>o.paid),'records');break;
 case'B09':num=os.filter(o=>o.paid);break;
 case'B10':num=os.filter(o=>o.paid);kind='records';mode='sum';unit='元';break;
 case'B13':num=db.orders.filter(o=>o.refunded&&o.refundD>=end-6&&o.refundD<=end&&(platform==='全部'||o.platform===platform));kind='records';mode='sum';unit='元';note='按退款发生日统计，原购买可能不在本周';break;
 case'B14':{num=os.filter(o=>o.paid&&db.orders.some(p=>p.uid===o.uid&&p.paid&&p.d<o.d));note='本周复购人数，不是成熟30天复购率';break;}
 case'cash':mode='missing';unit='元';note='假数据未提供结算现金与经营支出，不用成交额代替';break;
 }
 if(mode==='ratio')value=count(den,kind)?count(num,kind)/count(den,kind)*100:null;
 else if(mode==='sum')value=num.reduce((s,o)=>s+o.amount,0);
 else if(mode==='average')value=num.length?num.reduce((s,t)=>s+t.cost,0)/num.length:null;
 else if(mode==='median'){const sorted=num.map(t=>t.minutes).sort((a,b)=>a-b);value=sorted.length?(sorted[Math.floor((sorted.length-1)/2)]+sorted[Math.ceil((sorted.length-1)/2)])/2:null;}
 else if(mode==='missing')value=null;else value=count(num,kind);
 return{value,num,den,n:count(num,kind),total:count(den,kind),unit,mode,kind,note,group};
}
export const metrics={
result:['新结果查看用户','NS04','本周成功展示新生成普通结果正文的去重用户。'],
NS01:['每周核心使用用户数','NS01','过去7天至少查看一次有效内容、画像，或使用行动的去重账号。'],U02:['周活跃用户 WAU','U02','过去7个自然日内有效前台访问的去重账号。'],NS02:['周核心使用率','NS02','每周核心使用用户数 ÷ WAU。'],U01:['日活跃用户 DAU','U01','截止日有效前台访问的去重账号。'],U03:['DAU / MAU','U03','截止日DAU ÷ 过去30天去重活跃账号。'],new:['本周首活','NS03','本周首次有效活跃的用户。'],retained:['连续两周活跃','NS03','本周和前7天都活跃的用户。'],return:['间隔后回流','NS03','本周活跃，前7天未活跃，更早有活跃的用户。'],U06:['D7 活跃留存','U06','首活批次在第7个自然日回来的用户比例。'],U07:['累计7天回访','U07','首活后D1—D7任一天回来的用户比例。'],U05:['连续活跃 ≥ 3 天占比','U05 衍生','本周活跃用户中，截至截止日连续至少3天活跃的用户比例。'],U09:['本周活跃但未提交分析','U09 周口径','WAU中本周没有任何分析提交尝试的用户比例。'],U10:['旧内容回看用户','U10 人数','回看之前已查看内容的用户数，不算新分析。'],portrait:['画像查看用户','NS04','主动查看有内容画像的去重用户数。'],action:['行动使用用户','NS04','主动查看或操作行动的去重用户数。'],F01:['新增注册用户','F01','模拟中首活当天注册的账号数。'],F04:['首次提交完成率','F04','已满24h的注册用户中完成首次提交的比例。'],D01:['发起分析用户','D01 人数','主动提交分析的去重用户，重复提交不重复计人。'],D02:['提交受理率','D02','被服务端受理的逻辑请求 ÷ 所有提交请求。'],D04:['普通结果产出率','D04','生成普通结果的任务 ÷ 已受理任务；安全结果独立。'],D07:['普通结果展示率','D07','成功展示正文的结果 ÷ 普通可交付结果。'],D05:['结果生成耗时 P50','D05','受理到普通结果可交付的中位耗时，含排队与重试。'],failure:['技术失败任务','D04 下钻','服务端受理后技术失败的任务。'],quota:['额度不足拦截','D03 下钻','提交时由于额度不足被拒绝的逻辑请求。'],safety:['安全支持结果','D09 分母','单独计量，不计普通报告成功或技术失败。'],V02:['反馈参与率','V02 快照','有效点赞点踩结果数 ÷ 实际曝光反馈入口的结果数。'],V03:['点赞占比','V03 快照','点赞结果数 ÷ 有效点赞点踩结果数。'],V05:['点踩数量','V05 快照','最终反馈为点踩的结果数量。'],actionDone:['行动完成次数','V09 过程量','本期完成操作次数，不等于成熟行动完成率。'],Q06:['完整归因任务均摊成本','Q06','完整记录的模拟任务成本之和 ÷ 该任务数。'],Q07:['成本归因覆盖率','Q07','完整记录成本的任务 ÷ 进入执行的任务。'],B01:['商品页访问用户','B01 人数','本周打开商品页的去重用户。'],B04:['订单验证付款率','B04','验证付款的订单 ÷ 创建订单。'],B05:['付款后权益到账率','B05','成功发放权益的交易 ÷ 已验证付款交易。'],B09:['付费用户','B09','本周有验证付款交易的去重用户。'],B10:['成交金额','B10','已验证交易金额，人民币，不扣退款，不等于结算现金。'],B13:['当期退款金额','B13','退款发生在本周的金额，不按原购买日计算。'],B14:['本周再次购买用户','B14 过程量','本周购买且更早已有购买的用户；不是30天复购率。'],cash:['平台到账现金','B19','需独立结算记录；未提供，不能从交易额推算。']};
