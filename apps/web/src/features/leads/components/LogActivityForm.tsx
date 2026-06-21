import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { activitySchema, type ActivityFormValues } from "@workspace/api-client/zod/leads";
import type { TFunc } from "@workspace/core";

export interface LogActivityFormProps {
  isSaving: boolean;
  t: TFunc;
  onSubmit: (values: ActivityFormValues, reset: () => void) => void;
}

export function LogActivityForm({ isSaving, t, onSubmit }: LogActivityFormProps) {
  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: { type: "note", notes: "", outcome: "", nextAction: "" },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("leads.log_activity")}</CardTitle>
        <CardDescription>{t("leads.all_interactions")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => onSubmit(v, () => form.reset()))}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("leads.activity_type")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("leads.select_type")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="call">📞 {t("leads.activity.call")}</SelectItem>
                        <SelectItem value="meeting">🤝 {t("leads.activity.meeting")}</SelectItem>
                        <SelectItem value="email">✉️ {t("leads.activity.email")}</SelectItem>
                        <SelectItem value="message">💬 {t("leads.activity.message")}</SelectItem>
                        <SelectItem value="note">📝 {t("leads.activity.note")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("leads.duration")}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="15" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("leads.notes")} *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("leads.notes_placeholder")}
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="outcome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("leads.outcome")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("leads.outcome_placeholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nextAction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("leads.next_action_label")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("leads.next_action_placeholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? t("leads.saving") : t("leads.log_activity")}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
