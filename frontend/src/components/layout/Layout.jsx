import React from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import './Layout.css';

export function Layout({ children }) {
    return (
        <div className="app-layout">
            <Header />
            <div className="app-content">
                <Sidebar />
                <main className="main-content">
                    {children}
                </main>
            </div>
        </div>
    );
}