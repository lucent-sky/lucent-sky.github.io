import http.server
import socketserver

PORT = 8081

Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map.update({
  ".js" : "application/javascript",
})

httpd = socketserver.TCPServer(("", PORT), Handler)
httpd.serve_forever()
