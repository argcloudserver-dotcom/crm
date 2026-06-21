import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListResaleUnitsQueryKey,
  useCreateResaleUnit,
} from "@workspace/api-client";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Label } from "@/shared/components/ui/label";
import { Separator } from "@/shared/components/ui/separator";
import { useI18n } from "@/shared/contexts/i18nContext";
import { UNIT_TYPES, type PendingPhoto } from "@workspace/core";
import { resaleSchema, type ResaleFormValues } from "@workspace/api-client/zod/resale";
import { attachResalePhoto, uploadResalePhotoFile } from "@workspace/api-client/hooks/resale";
import { PhotoPicker } from "../components/PhotoPicker";

interface AddUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  pendingPhotos: PendingPhoto[];
  setPendingPhotos: (photos: PendingPhoto[]) => void;
}

export function AddUnitDialog({
  open,
  onOpenChange,
  isAdmin,
  pendingPhotos,
  setPendingPhotos,
}: AddUnitDialogProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const createUnit = useCreateResaleUnit();

  const form = useForm<ResaleFormValues>({
    resolver: zodResolver(resaleSchema),
    defaultValues: {
      projectName: "",
      unitType: "apartment",
      area: "",
      price: "",
      ownerName: "",
      ownerPhone: "",
      ownerEmail: "",
      ownerNotes: "",
      description: "",
      isOwnerPhoneHidden: false,
      isOwnerEmailHidden: false,
    },
  });

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      pendingPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPendingPhotos([]);
      form.reset();
    }
    onOpenChange(nextOpen);
  }

  const onSubmit = (data: ResaleFormValues) => {
    createUnit.mutate(
      { data: data as never },
      {
        onSuccess: async (newUnit: { id?: string } | undefined) => {
          if (pendingPhotos.length > 0 && newUnit?.id) {
            let uploaded = 0;
            for (const { file } of pendingPhotos) {
              try {
                const url = await uploadResalePhotoFile(file as File);
                await attachResalePhoto(newUnit.id, url);
                uploaded++;
              } catch {
                /* skip failed photos */
              }
            }
            pendingPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
            setPendingPhotos([]);
            if (uploaded > 0) toast.success(`${uploaded} ${t("resale.photo_added")}`);
          }
          queryClient.invalidateQueries({ queryKey: getListResaleUnitsQueryKey() });
          toast.success(t("resale.unit_added"));
          onOpenChange(false);
          form.reset();
        },
        onError: (err: Error) => toast.error(err.message || t("common.error")),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> {t("resale.add")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[660px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("resale.add_new")}</DialogTitle>
          <DialogDescription>{t("resale.add_new_desc") || "Fill in the details to add a new resale unit."}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="projectName" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("resale.project_name")}</FormLabel>
                  <FormControl><Input placeholder="e.g. Marina Gate" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="unitType" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("resale.unit_type")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {UNIT_TYPES.map((ty) => (
                        <SelectItem key={ty} value={ty} className="capitalize">{ty}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("resale.price_egp")}</FormLabel>
                  <FormControl><Input placeholder="1500000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="area" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("resale.area_sqm")}</FormLabel>
                  <FormControl><Input placeholder="120" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="floor" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("resale.floor")}</FormLabel>
                  <FormControl><Input type="number" placeholder="5" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("resale.description")}</FormLabel>
                <FormControl>
                  <Textarea placeholder="Describe the unit..." rows={2} className="resize-none" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="space-y-2">
              <p className="text-sm font-medium">{t("resale.photos_section")}</p>
              <PhotoPicker value={pendingPhotos} onChange={setPendingPhotos} />
            </div>

            <Separator />
            <p className="text-sm font-medium text-muted-foreground">{t("resale.owner_details")}</p>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="ownerName" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("resale.owner_name")}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="ownerPhone" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("resale.owner_phone")}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="ownerEmail" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("resale.owner_email")}</FormLabel>
                <FormControl><Input type="email" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="ownerNotes" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("resale.owner_notes")}</FormLabel>
                <FormControl><Textarea rows={2} className="resize-none" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {isAdmin && (
              <div className="flex gap-6 pt-1">
                <FormField control={form.control} name="isOwnerPhoneHidden" render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <Label className="font-normal">{t("resale.hide_phone")}</Label>
                  </FormItem>
                )} />
                <FormField control={form.control} name="isOwnerEmailHidden" render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <Label className="font-normal">{t("resale.hide_email")}</Label>
                  </FormItem>
                )} />
              </div>
            )}

            <DialogFooter className="mt-2">
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>{t("common.cancel")}</Button>
              <Button type="submit" disabled={createUnit.isPending}>
                {createUnit.isPending ? t("resale.adding") : t("resale.add")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
