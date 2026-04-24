import re

with open("client/src/pages/BillingPage.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Fix line 845 (index 844) - add flex-wrap and gap
lines[844] = (
    "            <div classNameflex flex-wrap items-center justify-between gap-3>\n"
)

# Fix line 854 (index 853) - add flex-wrap
lines[853] = "              <div classNameflex flex-wrap items-center gap-2>\n"

# Fix line 859 - search input width
lines[858] = "                    classNamepl-9 w-full sm:w-[200px] bg-[#E8E8ED]\n"

# Fix line 865 - SelectTrigger width
lines[864] = (
    "                    <SelectTrigger classNamew-full sm:w-[140px] bg-[#E8E8ED]>\n"
)

with open("client/src/pages/BillingPage.tsx", "w", encoding="utf-8") as f:
    f.writelines(lines)

print("Done")
