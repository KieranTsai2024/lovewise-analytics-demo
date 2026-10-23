// Deterministic diagnostic rules: no model calls or causal claims.
export function diagnose(current,previous,{comparable=true}={}){
 if(!comparable)return{items:[],message:'两个周期需要等长且互不重叠，才能进行自动优先级比较。请调整日期后重试。'};
 const rules=[
 ['B05','检查已付款但未到账的权益',0,'核对未发放交易，优先修复权益发放或恢复流程。','B04','付款率稳定或上升，不能因此认为整个购买流程都恶化。','订单数较少时，个别交易就会造成大幅波动。'],
 ['D04','检查分析结果生成环节',1,'拆开技术失败与安全支持结果，再核查失败任务；仅对技术故障安排修复。','D07','已生成结果的展示率稳定或上升，问题可能集中在生成之前。','安全支持结果也不属于普通结果，产出率下降不一定是技术故障。'],
 ['D07','检查结果展示与等待体验',1,'对照耗时和未展示任务，核查结果入口、加载状态及用户离开时点。','D04','普通结果产出率稳定或上升，不支持把问题归因于生成失败。','结果未展示也可能因为用户离开，当前数据不能证明是页面故障。'],
 ['D02','检查提交受理的阻碍',1,'先查看额度不足和材料校验的构成，再决定优化额度提示还是材料提交。','D04','已受理任务的产出率稳定或上升，不支持优先修改生成服务。','受理下降可能来自额度限制或材料变化，不能直接当作技术失败。'],
 ['NS02','检查核心功能使用减少的环节',2,'先比较新老用户构成，再检查新结果、旧内容、画像和行动使用。','D07','结果展示率稳定或上升，不支持直接判断交付体验变差。','用户构成、需求时机都可能改变；不能据此断言产品没有帮助。'],
 ['B04','检查商品页之后的支付转化',2,'核查未付款订单的取消、验证失败和支付流程，再评估商品表达。','B05','权益到账率稳定或上升，不支持把付款下降归因于到账失败。','价格、商品组合与用户购买意愿可能不同，不能直接得出应当降价。'],
 ['V03','检查负面反馈集中的结果',3,'查看点踩结果的分析类型和版本，先做针对性质量复核。','V02','反馈参与率稳定或上升，但参与者仍未必代表全部用户。','这是自愿反馈快照，样本选择和反馈窗口都会影响结果。']
 ];
 const items=[];
 for(const [key,title,tier,action,other,counter,limit]of rules){const a=current(key),b=previous(key);if(a.value==null||b.value==null||a.total<20||b.total<20)continue;const drop=b.value-a.value;if(drop<3)continue;
 const x=current(other),y=previous(other);const otherText=x.value==null||y.value==null?'相关指标缺少可比数据，暂时无法提供交叉验证。':`${other}：${y.value.toFixed(1)}% → ${x.value.toFixed(1)}%。${x.value>=y.value?counter:'相关指标也下降，当前证据不足以把原因限定在这一环节。'}`;
 items.push({key,title,tier,drop,action,other,otherText,limit,support:`${b.value.toFixed(1)}% → ${a.value.toFixed(1)}%，下降 ${drop.toFixed(1)} 个百分点。本期 ${a.n}/${a.total}，对比期 ${b.n}/${b.total}。`,scope:`本期分母 ${a.total} ${a.kind==='users'?'位用户':'条记录'}；周期内汇总变化，尚未做因果验证。`});
 }
 items.sort((a,b)=>a.tier-b.tier||b.drop-a.drop||a.key.localeCompare(b.key));
 // Delivery bottlenecks take precedence over their aggregate core-use symptom.
 const hasDelivery=items.some(x=>['D02','D04','D07'].includes(x.key));
 const filtered=hasDelivery?items.filter(x=>x.key!=='NS02'):items;
 return{items:filtered.slice(0,3),message:filtered.length?'按权益交付、分析交付、使用与付款、反馈的顺序排查；同类按下降百分点排序。':'当前没有满足初筛规则的下降候选；这不代表产品没有问题。'};
}
