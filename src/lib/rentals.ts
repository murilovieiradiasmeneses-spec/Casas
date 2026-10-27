import type { Tables } from "@/integrations/supabase/types";

export type Rental = Tables<"crm_rentals">;
export type RentReceivable = Tables<"crm_rent_receivables">;
export type RentalProperty = {id:string;title:string;purpose:string;status:string;price:number;neighborhood?:string};
export type RentalTotals = {
  active:number; registered:number; monthlyContracted:number;
  openAmount:number; overdueAmount:number; dueSoonAmount:number;
  receivedThisMonth:number; pending:number; overdueCount:number;
};
/** Brazilian-local calendar date: avoid a UTC day shift near midnight. */
export function rentalLocalToday(now=new Date()):string {
  const pad=(n:number)=>String(n).padStart(2,"0");
  return now.getFullYear()+"-"+pad(now.getMonth()+1)+"-"+pad(now.getDate());
}
export function rentalFirstMonth(now=new Date()):string {return rentalLocalToday(now).slice(0,7)+"-01";}
export function rentalDueDate(referenceMonth:string,dueDay:number):string {
  if(!/^\d{4}-\d{2}-01$/.test(referenceMonth)||!Number.isInteger(dueDay)||dueDay<1||dueDay>28)
    throw Error("Mês ou dia de vencimento inválido.");
  return referenceMonth.slice(0,8)+String(dueDay).padStart(2,"0");
}
export function rentalTotals(rentals:Rental[],items:RentReceivable[],now=new Date()):RentalTotals {
  const today=rentalLocalToday(now);
  const month=today.slice(0,7);
  const next7=new Date(now.getFullYear(),now.getMonth(),now.getDate()+7);
  const soon=rentalLocalToday(next7);
  const pending=items.filter(i=>i.status==="pendente");
  const overdue=pending.filter(i=>i.due_date<today);
  return {
    active:rentals.filter(r=>r.status==="ativo").length,
    registered:rentals.length,
    monthlyContracted:rentals.filter(r=>r.status==="ativo").reduce((n,r)=>n+Number(r.monthly_rent),0),
    openAmount:pending.reduce((n,i)=>n+Number(i.amount),0),
    overdueAmount:overdue.reduce((n,i)=>n+Number(i.amount),0),
    dueSoonAmount:pending.filter(i=>i.due_date>=today&&i.due_date<=soon).reduce((n,i)=>n+Number(i.amount),0),
    receivedThisMonth:items.filter(i=>i.status==="recebido"&&i.received_at?.slice(0,7)===month)
      .reduce((n,i)=>n+Number(i.amount),0),
    pending:pending.length,
    overdueCount:overdue.length,
  };
}
export function rentPaymentStatus(payment:Pick<RentReceivable,"status"|"due_date">,now=new Date()){
  if(payment.status==="recebido")return "Recebido";
  return payment.due_date<rentalLocalToday(now)?"Vencido":"A receber";
}
export function rentalBRL(value:number|string|null|undefined){
  return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value??0));
}
export function validRentalMoney(raw:number):boolean {
  return Number.isFinite(raw) && raw>0 && raw<=9999999999 && Math.round(raw*100)===raw*100;
}
