# Architecture diagram

GitHub supports Mermaid diagrams in Markdown.

```mermaid
flowchart LR
  U[User] -->|WhatsApp / Postman / curl| C[Client]
  C -->|HTTP POST + X-Proxy-Key\n127.0.0.1:18793| P[Local VoiceMonkey Proxy]
  P -->|GET /trigger| VM1[VoiceMonkey Trigger API]
  P -->|GET /announcement\n(UTF-8 percent-encoded)| VM2[VoiceMonkey Announcement API]
  VM1 -->|Alexa routine| A[(Alexa / Echo)]
  VM2 -->|Announcement spoken\n(voice + language)| A

  subgraph Local machine (Windows/macOS/Linux)
    P
  end
```

If you want a PNG for sharing, you can copy the Mermaid block into https://mermaid.live and export.
