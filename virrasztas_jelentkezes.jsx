import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function VirrasztasJelentkezes() {
  // Generáljuk az idősávokat: okt. 4. 22:00 – okt. 5. 09:00
  const generateSlots = () => {
    const slots = [];
    let start = new Date("2025-10-04T22:00:00");
    const end = new Date("2025-10-05T09:00:00");
    while (start < end) {
      let endHour = new Date(start);
      endHour.setHours(endHour.getHours() + 1);
      slots.push({
        time: `${start.getHours().toString().padStart(2, "0")}:00 - ${endHour
          .getHours()
          .toString()
          .padStart(2, "0")}:00`,
        booked: false,
        details: null,
      });
      start = endHour;
    }
    return slots;
  };

  const [slots, setSlots] = useState(generateSlots);
  const [open, setOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  const handleBook = (slotIndex) => {
    setSelectedSlot(slotIndex);
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name || !form.email || !form.phone) return;
    const updated = [...slots];
    updated[selectedSlot] = {
      ...updated[selectedSlot],
      booked: true,
      details: { ...form },
    };
    setSlots(updated);
    setForm({ name: "", email: "", phone: "" });
    setOpen(false);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Virrasztás jelentkezés</h1>
      <p className="mb-6 text-gray-600">Október 4. 22:00 – Október 5. 09:00</p>

      <div className="grid gap-4">
        {slots.map((slot, i) => (
          <Card key={i} className="p-4 flex justify-between items-center">
            <CardContent className="p-0">
              <p className="font-medium">{slot.time}</p>
              {slot.booked && (
                <p className="text-sm text-red-600">Foglalt ({slot.details.name})</p>
              )}
            </CardContent>
            {!slot.booked && (
              <Button onClick={() => handleBook(i)}>Jelentkezem</Button>
            )}
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Jelentkezés: {selectedSlot !== null && slots[selectedSlot].time}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Név"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              placeholder="E-mail"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              placeholder="Telefonszám"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Button onClick={handleSubmit} className="w-full">
              Küldés
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
