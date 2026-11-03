import matplotlib.pyplot as plt
import matplotlib.patches as patches

fig, ax = plt.subplots(figsize=(13, 6), dpi=300)
ax.set_xlim(0, 13)
ax.set_ylim(0, 6)
ax.axis('off')

# Background
fig.patch.set_facecolor('#0f172a')
ax.set_facecolor('#0f172a')

# Title
ax.text(6.5, 5.4, 'Part 4: Cloud Streaming Pipeline Architecture (AWS)', 
        ha='center', va='center', fontsize=18, fontweight='bold', color='#f8fafc', fontfamily='sans-serif')
ax.text(6.5, 4.95, 'Real-Time Ingestion, Micro-Batching, S3 Data Lake & Athena SQL Analytics', 
        ha='center', va='center', fontsize=11, color='#94a3b8', fontfamily='sans-serif')

boxes = [
    {"x": 0.5, "y": 2.2, "w": 2.2, "h": 1.6, "title": "Payment Producer", "sub": "Python / Lambda\n(Webhook Events)", "color": "#38bdf8", "bg": "#1e293b", "border": "#0284c7"},
    {"x": 3.2, "y": 2.2, "w": 2.2, "h": 1.6, "title": "Kinesis Data Streams", "sub": "Shard: 1 MB/s in\nPartitionKey: invoiceId", "color": "#fb923c", "bg": "#1e293b", "border": "#ea580c"},
    {"x": 5.9, "y": 2.2, "w": 2.2, "h": 1.6, "title": "Amazon Data Firehose", "sub": "Buffer: 60s / 5MB\nFormat: newline-delim JSON", "color": "#facc15", "bg": "#1e293b", "border": "#ca8a04"},
    {"x": 8.6, "y": 2.2, "w": 2.0, "h": 1.6, "title": "Amazon S3", "sub": "Data Lake Storage\ncloud-stream/YYYY/MM/DD", "color": "#4ade80", "bg": "#1e293b", "border": "#16a34a"},
    {"x": 11.0, "y": 2.2, "w": 1.6, "h": 1.6, "title": "Amazon Athena", "sub": "Serverless SQL\nstreamed_payments", "color": "#c084fc", "bg": "#1e293b", "border": "#9333ea"},
    {"x": 3.2, "y": 0.3, "w": 2.2, "h": 1.1, "title": "CloudWatch Alarm", "sub": "IncomingRecords > 0\nFailure Rate > 10%", "color": "#f87171", "bg": "#1e293b", "border": "#dc2626"},
    {"x": 5.9, "y": 0.3, "w": 2.2, "h": 1.1, "title": "Amazon SNS", "sub": "Email / SMS Alert\nOps Notification", "color": "#f472b6", "bg": "#1e293b", "border": "#db2777"}
]

for b in boxes:
    rect = patches.FancyBboxPatch((b['x'], b['y']), b['w'], b['h'],
                                  boxstyle="round,pad=0.1,rounding_size=0.15",
                                  facecolor=b['bg'], edgecolor=b['border'], linewidth=2)
    ax.add_patch(rect)
    ax.text(b['x'] + b['w']/2, b['y'] + b['h']*0.72, b['title'], 
            ha='center', va='center', fontsize=11, fontweight='bold', color=b['color'])
    ax.text(b['x'] + b['w']/2, b['y'] + b['h']*0.35, b['sub'], 
            ha='center', va='center', fontsize=8.5, color='#cbd5e1', multialignment='center')

def draw_arrow(x1, y1, x2, y2, label=""):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle="->,head_width=0.35,head_length=0.45", lw=2, color='#38bdf8'))
    if label:
        ax.text((x1+x2)/2, (y1+y2)/2 + 0.18, label, ha='center', va='bottom', fontsize=8, color='#94a3b8')

draw_arrow(2.7, 3.0, 3.2, 3.0, "PutRecord")
draw_arrow(5.4, 3.0, 5.9, 3.0, "Stream Record")
draw_arrow(8.1, 3.0, 8.6, 3.0, "Batch Delivery")
draw_arrow(10.6, 3.0, 11.0, 3.0, "External Table")
draw_arrow(4.3, 2.2, 4.3, 1.4, "Metrics")
draw_arrow(5.4, 0.85, 5.9, 0.85, "Trigger Alert")

plt.tight_layout()
plt.savefig("lab8/part4/pipeline_diagram.png", facecolor=fig.get_facecolor(), edgecolor='none', dpi=300)
print("Diagram saved to lab8/part4/pipeline_diagram.png")
