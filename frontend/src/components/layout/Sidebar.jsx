import React from "react"; 
import './Sidebar.css';

export function Sidebar() {
    return (
        <aside className="app-sidebar">
            <nav className="sidebar-nav">
                <ul>
                    <li className="nav-item active">概率TTK折线图</li>
                </ul>
            </nav>
        </aside>
    );
}