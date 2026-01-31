use tiny_http::{Header, Response, Server};

// Embed the HTML file at compile time
const EDITOR_HTML: &str = include_str!("../editor.html");

fn main() {
    // Try to find an available port starting from 8080
    let (server, port) = find_available_port().expect("Failed to start server on any port");
    let url = format!("http://127.0.0.1:{}", port);

    println!("🚀 Web Editor running at {}", url);
    println!("Press Ctrl+C to stop\n");

    // Open browser automatically
    if let Err(e) = open::that(&url) {
        eprintln!(
            "Couldn't open browser automatically: {}\nPlease open {} manually.",
            e, url
        );
    }

    // Handle incoming requests
    for request in server.incoming_requests() {
        let path = request.url();

        // Serve the editor HTML for root path
        if path == "/" || path == "/index.html" {
            let content_type =
                Header::from_bytes("Content-Type", "text/html; charset=utf-8").unwrap();
            let response = Response::from_string(EDITOR_HTML).with_header(content_type);
            let _ = request.respond(response);
        } else {
            // 404 for anything else
            let response = Response::from_string("Not Found")
                .with_status_code(404)
                .with_header(Header::from_bytes("Content-Type", "text/plain").unwrap());
            let _ = request.respond(response);
        }
    }
}

/// Try to bind to ports 8080-8090, return the first available one
fn find_available_port() -> Option<(Server, u16)> {
    for port in 8080..=8090 {
        let addr = format!("127.0.0.1:{}", port);
        if let Ok(server) = Server::http(&addr) {
            return Some((server, port));
        }
    }
    None
}
