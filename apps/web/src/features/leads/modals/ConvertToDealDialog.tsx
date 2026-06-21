import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trophy } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/shared/utils/utils";
import {
  convertDealSchema, type ConvertDealFormValues,
} from "@workspace/api-client/zod/leads";
import type { TFunc } from "@workspace/core";

export interface ConvertToDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues: Partial<ConvertDealFormValues>;
  projects: any[];
  users: any[];
  isAr: boolean;
  isPending: boolean;
  t: TFunc;
  onSubmit: (values: ConvertDealFormValues, skipConvert?: boolean) => void;
}

export function ConvertToDealDialog({
  open, onOpenChange, initialValues, projects, users, isAr, isPending, t, onSubmit,
}: ConvertToDealDialogProps) {
  const form = useForm<ConvertDealFormValues>({
    resolver: zodResolver(convertDealSchema),
    values: {
      dealValue: "",
      unitNumber: "",
      area: "",
      downPayment: "",
      contractDate: new Date().toISOString().slice(0, 10),
      installmentAmount: "",
      ...initialValues,
    },
  });

  const paymentMethod = form.watch("paymentMethod");
  const showInstallments = paymentMethod === "installments" || paymentMethod === "mortgage";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            {t("leads.won_dialog_title")}
          </DialogTitle>
          <DialogDescription>{t("leads.won_dialog_desc")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => onSubmit(v))} className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                {t("clients.deal_info")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="dealValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("leads.deal_value_label")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("leads.deal_value_placeholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contractDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("clients.contract_date")}</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("clients.project")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="assignedSalesId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("clients.assigned_sales")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.map((u: any) => (
                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                {t("clients.unit_info")}
              </p>
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="unitNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("clients.unit_number")}</FormLabel>
                      <FormControl><Input placeholder="B-302" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unitType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("clients.unit_type")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="apartment">{t("clients.unit_type_apartment")}</SelectItem>
                          <SelectItem value="villa">{t("clients.unit_type_villa")}</SelectItem>
                          <SelectItem value="duplex">{t("clients.unit_type_duplex")}</SelectItem>
                          <SelectItem value="penthouse">{t("clients.unit_type_penthouse")}</SelectItem>
                          <SelectItem value="townhouse">{t("clients.unit_type_townhouse")}</SelectItem>
                          <SelectItem value="commercial">{t("clients.unit_type_commercial")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("clients.area")}</FormLabel>
                      <FormControl><Input placeholder="145" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                {t("clients.payment_info")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem className="col-span-2 sm:col-span-1">
                      <FormLabel>{t("clients.payment_method")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">{t("clients.payment_cash")}</SelectItem>
                          <SelectItem value="installments">{t("clients.payment_installments")}</SelectItem>
                          <SelectItem value="mortgage">{t("clients.payment_mortgage")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {showInstallments && (
                  <>
                    <FormField
                      control={form.control}
                      name="downPayment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("clients.down_payment")}</FormLabel>
                          <FormControl><Input placeholder="500,000" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="numberOfInstallments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("clients.num_installments")}</FormLabel>
                          <FormControl><Input type="number" placeholder="24" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="installmentAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("clients.installment_amount")}</FormLabel>
                          <FormControl><Input placeholder="83,333" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 flex-wrap">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onSubmit(form.getValues(), true)}
                disabled={isPending}
              >
                {t("leads.skip_and_mark_won")}
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                <Trophy className={cn("h-4 w-4", isAr ? "ml-2" : "mr-2")} />
                {isPending ? t("leads.converting") : t("leads.convert_to_deal")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
