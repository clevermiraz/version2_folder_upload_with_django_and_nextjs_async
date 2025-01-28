import "./styles/globals.css";

export const metadata = {
    title: "Folder Upload",
    description: "Folder Upload On Streamming",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
