import { useEffect, useState } from "react";
import * as notifications from "../../api/notifications";
import { extractErrorMessage } from "../../api/client";
import "./Notifications.css";

export default function Notifications() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        notifications
            .list()
            .then(setItems)
            .catch((err) => setError(extractErrorMessage(err, "Failed to load notifications.")))
            .finally(() => setLoading(false));
    }, []);

    async function handleMarkRead(notification) {
        try {
            await notifications.markRead(notification.notificationId);
            setItems((current) =>
                current.map((item) =>
                    item.notificationId === notification.notificationId ? { ...item, isRead: true } : item,
                ),
            );
        } catch (err) {
            setError(extractErrorMessage(err, "Failed to mark notification as read."));
        }
    }

    return (
        <div className="ntf-page">
            <h1 className="ntf-title">Notifications</h1>

            {error && <p className="ntf-message">{error}</p>}

            <div className="ntf-card">
                {loading ? (
                    <p className="ntf-empty">Loading notifications...</p>
                ) : items.length === 0 ? (
                    <p className="ntf-empty">You have no notifications.</p>
                ) : (
                    <ul className="ntf-list">
                        {items.map((item) => (
                            <li
                                key={item.notificationId}
                                className={"ntf-item" + (item.isRead ? "" : " ntf-item--unread")}
                            >
                                <div className="ntf-item-body">
                                    <span className="ntf-item-type">{item.type}</span>
                                    <p className="ntf-item-message">{item.message}</p>
                                    <span className="ntf-item-time">
                                        {new Date(item.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                {!item.isRead && (
                                    <button type="button" onClick={() => handleMarkRead(item)}>
                                        Mark as read
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
