import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { addSource } from '../services/sources';

const Chat = () => {
  const [sources, setSources] = useState([]);

  const handleAddToSources = async (message) => {
    try {
      const response = await addSource(notebookId, {
        content: message.content,
        type: "text",
        metadata: {
          title: "Chat Message",
          description: "Added from chat conversation",
          timestamp: new Date().toISOString()
        }
      });

      // Update the sources list immediately
      const updatedSources = [...sources, response.data];
      setSources(updatedSources);

      // Show success message
      toast.success("Message added to sources");
    } catch (error) {
      console.error("Error adding source:", error);
      toast.error("Failed to add message to sources");
    }
  };

  return (
    <div>
      {/* Rest of the component code */}
    </div>
  );
};

export default Chat; 