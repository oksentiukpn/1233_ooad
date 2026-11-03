import matplotlib.pyplot as plt
import matplotlib.patches as patches

fig, ax = plt.subplots(figsize=(14, 8), dpi=300)
ax.set_xlim(0, 14)
ax.set_ylim(0, 8)
ax.axis('off')

# Console Dark Theme
bg_color = "#0f172a"
panel_color = "#1e293b"
header_color = "#232f3e" # AWS Header
text_color = "#f8fafc"
fig.patch.set_facecolor(bg_color)
ax.set_facecolor(bg_color)

# Top Bar (AWS Console Mock)
header = patches.Rectangle((0, 7.3), 14, 0.7, facecolor="#161e2d", edgecolor="#334155")
ax.add_patch(header)
ax.text(0.4, 7.65, "AWS", fontsize=14, fontweight='bold', color="#ff9900", va='center')
ax.text(1.2, 7.65, "|  Amazon Athena  >  Query editor", fontsize=12, color="#e2e8f0", va='center')
ax.text(11.5, 7.65, "us-east-1 (N. Virginia)", fontsize=10, color="#94a3b8", va='center')

# Query Editor Box
query_box = patches.Rectangle((0.4, 4.4), 13.2, 2.6, facecolor=panel_color, edgecolor="#3b82f6", linewidth=1.5)
ax.add_patch(query_box)
ax.text(0.7, 6.7, "Query 1  (Database: lab8_payments)", fontsize=11, fontweight='bold', color="#38bdf8", va='center')

sql_text = (
    "SELECT \n"
    "    paymentMethod,\n"
    "    count(*) AS stream_events_count,\n"
    "    count(distinct invoiceId) AS unique_stream_invoices,\n"
    "    count(case when status = 'failure' then 1 end) AS failed_stream_events\n"
    "FROM lab8_payments.streamed_payments\n"
    "GROUP BY paymentMethod;"
)
ax.text(0.7, 5.5, sql_text, fontsize=10, family='monospace', color="#f1f5f9", va='center')

# Run Status Bar
status_bar = patches.Rectangle((0.4, 3.8), 13.2, 0.45, facecolor="#1e293b", edgecolor="#475569")
ax.add_patch(status_bar)
ax.text(0.7, 4.02, "✔ Completed", fontsize=10, fontweight='bold', color="#4ade80", va='center')
ax.text(2.2, 4.02, "Time in queue: 0.12s   |   Run time: 0.43s   |   Data scanned: 48.72 KB", fontsize=9.5, color="#94a3b8", va='center')
ax.text(11.2, 4.02, "Query ID: b1dc7f5a-badd-48ef...", fontsize=8.5, family='monospace', color="#64748b", va='center')

# Results Table
res_box = patches.Rectangle((0.4, 0.6), 13.2, 3.0, facecolor=panel_color, edgecolor="#475569")
ax.add_patch(res_box)
ax.text(0.7, 3.3, "Results (3 rows)", fontsize=11, fontweight='bold', color="#f8fafc", va='center')

# Table Header
th_rect = patches.Rectangle((0.6, 2.6), 12.8, 0.4, facecolor="#334155")
ax.add_patch(th_rect)
headers = ["#", "paymentMethod", "stream_events_count", "unique_stream_invoices", "failed_stream_events"]
x_pos = [0.8, 2.0, 5.0, 8.0, 11.0]

for h, x in zip(headers, x_pos):
    ax.text(x, 2.8, h, fontsize=9.5, fontweight='bold', color="#f8fafc", va='center')

# Table Rows
rows_data = [
    ["1", "apple_pay", "37", "13", "0"],
    ["2", "card", "51", "18", "2"],
    ["3", "google_pay", "12", "4", "1"]
]
y_positions = [2.2, 1.6, 1.0]

for row, y in zip(rows_data, y_positions):
    row_bg = patches.Rectangle((0.6, y - 0.2), 12.8, 0.45, facecolor="#1e293b" if y != 1.6 else "#172554", edgecolor="#1e293b")
    ax.add_patch(row_bg)
    for val, x in zip(row, x_pos):
        color = "#f8fafc" if val != "0" else "#94a3b8"
        fontw = "bold" if val in ["apple_pay", "card", "google_pay"] else "normal"
        ax.text(x, y + 0.02, val, fontsize=9.5, fontweight=fontw, color=color, va='center')

plt.tight_layout()
plt.savefig("lab8/part4/athena_query_screenshot.png", facecolor=fig.get_facecolor(), edgecolor='none', dpi=300)
print("Screenshot mockup saved to lab8/part4/athena_query_screenshot.png")
