import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
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
import { Textarea } from "@/shared/components/ui/textarea";
import { editLeadSchema, type EditLeadFormValues } from "@workspace/api-client/zod/leads";
import type { TFunc } from "@workspace/core";

export interface EditLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: any;
  isSaving: boolean;
  t: TFunc;
  onSubmit: (values: EditLeadFormValues) => void;
}

export function EditLeadDialog({
  open, onOpenChange, lead, isSaving, t, onSubmit,
}: EditLeadDialogProps) {
  const form = useForm<EditLeadFormValues>({
    resolver: zodResolver(editLeadSchema),
    values: lead
      ? {
          name: lead.name ?? "",
          phone: lead.phone ?? "",
          email: lead.email ?? "",
          source: (lead.source as any) ?? "manual",
          notes: lead.notes ?? "",
          nextAction: lead.nextAction ?? "",
          deadline: lead.deadline ? format(new Date(lead.deadline), "yyyy-MM-dd") : "",
          nextActionAt: lead.nextActionAt ? format(new Date(lead.nextActionAt), "yyyy-MM-dd") : "",
        }
      : undefined,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("leads.edit_lead")}</DialogTitle>
          <DialogDescription>{t("leads.all_interactions")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>{t("leads.full_name")}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("leads.phone_label")}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("leads.email")}</FormLabel>
                    <FormControl><Input type="email" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("leads.source")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {["manual", "import", "campaign", "referral", "website", "social"].map(s => (
                          <SelectItem key={s} value={s}>{t(`leads.source.${s}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("leads.deadline")}</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nextAction"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>{t("leads.next_action_label")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("leads.next_action_short_placeholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nextActionAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("leads.next_action_date")}</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>{t("leads.notes")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("leads.notes_general_placeholder")}
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? t("leads.saving") : t("leads.save_changes")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
