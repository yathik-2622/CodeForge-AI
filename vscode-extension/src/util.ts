import * as crypto from "crypto";
import * as vscode from "vscode";

export function getNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function getWebviewUri(webview: vscode.Webview, extensionUri: vscode.Uri, ...pathSegments: string[]): vscode.Uri {
  return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...pathSegments));
}
