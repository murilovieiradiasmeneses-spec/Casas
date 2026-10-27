import {describe,it,expect} from "vitest";
import {rentalDueDate,rentalFirstMonth,rentalTotals,rentPaymentStatus,validRentalMoney} from "@/lib/rentals";
import type {Rental,RentReceivable} from "@/lib/rentals";
const rental=(id:string,status:"ativo"|"encerrado",rent:number)=>({id,status,monthly_rent:rent}) as Rental;
const payment=(id:string,amount:number,due_date:string,status:"pendente"|"recebido",received_at:string|null=null)=>
 ({id,amount,due_date,status,received_at}) as RentReceivable;
describe("controle de aluguéis",()=>{
  const now=new Date(2026,9,27,12);
  it("calcula saldos vencidos, próximos, recebidos e contratos ativos",()=>{
    const r=rentalTotals([rental("a","ativo",2000),rental("b","encerrado",1300)],[
      payment("1",2000,"2026-10-20","pendente"),
      payment("2",2000,"2026-10-30","pendente"),
      payment("3",2000,"2026-11-20","pendente"),
      payment("4",1300,"2026-10-10","recebido","2026-10-25T09:00:00Z"),
    ],now);
    expect(r).toMatchObject({active:1,registered:2,monthlyContracted:2000,openAmount:6000,
      overdueAmount:2000,dueSoonAmount:2000,receivedThisMonth:1300,pending:3,overdueCount:1});
  });
  it("não considera recebido como vencido",()=>{
    expect(rentPaymentStatus(payment("1",1200,"2026-10-01","recebido"),now)).toBe("Recebido");
    expect(rentPaymentStatus(payment("2",1200,"2026-10-01","pendente"),now)).toBe("Vencido");
  });
  it("gera vencimentos de 1 a 28 sem instabilidade de meses",()=>{
    expect(rentalDueDate("2026-02-01",28)).toBe("2026-02-28");
    expect(rentalFirstMonth(now)).toBe("2026-10-01");
    expect(()=>rentalDueDate("2026-02-01",31)).toThrow();
  });
  it("valida aluguel mensal em centavos",()=>{
    expect(validRentalMoney(1500.75)).toBe(true);
    expect(validRentalMoney(0)).toBe(false);
    expect(validRentalMoney(1.999)).toBe(false);
  });
});
