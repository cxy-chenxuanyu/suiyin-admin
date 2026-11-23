/* Accepted FRIEND-REQUEST-TIME@1.0.0: only the two existing friend-list routes. */
'use strict';
window.AdminFriendRequestTime=(()=>{
 const routes=new Set(['customerManagement','yxCustomerList']);
 function table(value,route){
  if(!routes.has(route)||value.headers.includes('申请时间'))return value;
  const after=value.headers.indexOf('添加时间'),index=after<0?Math.max(0,value.headers.indexOf('操作')):after+1;
  value.headers.splice(index,0,'申请时间');
  value.rows.forEach(row=>row.cells.splice(index,0,'—'));
  return value;
 }
 function forms(value,route){
  if(!routes.has(route))return value;
  return [...value,{fields:[{label:'申请时间',text:'申请时间\n至',controls:[{type:'date',placeholder:'开始日期'},{type:'date',placeholder:'结束日期'}]}]}];
 }
 function matches(row,value,label,query){
  if(!/^申请时间：/.test(label))return true;
  const date=row.cells[value.headers.indexOf('申请时间')]?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if(!date)return false;
  return /开始/.test(label)?date>=query:date<=query;
 }
 return {table,forms,matches};
})();
