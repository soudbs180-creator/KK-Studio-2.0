export default function ConversationStatus({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="chat-status" role="status">
      {message}
    </p>
  );
}

