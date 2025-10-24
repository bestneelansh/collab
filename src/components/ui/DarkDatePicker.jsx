import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import "/Users/neelanshgoyal/Documents/collatz/src/components/ui/DarkDatePicker.module.css"

export default function DarkDatePicker({ selected, onSelect }) {
  return (
    <div className="darkDatePickerWrapper">
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={onSelect}
        captionLayout="dropdown" // ✅ allows month & year dropdowns
      />
    </div>
  );
}
