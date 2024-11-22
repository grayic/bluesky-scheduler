import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Send, Calendar, Image, Smile, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import EmojiPicker from 'emoji-picker-react';
import { MediaFile } from '../types/bluesky';
import { sanitizeImage } from '../utils/imageUtils';

interface PostFormProps {
  onPostScheduled: (post: { text: string; scheduledFor: string; media?: MediaFile[] }) => void;
}

export const PostForm: React.FC<PostFormProps> = ({ onPostScheduled }) => {
  const [text, setText] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { agent } = useAuth();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const selectedFiles = Array.from(files);
    
    if (selectedFiles.length + mediaFiles.length > 4) {
      toast.error('Maximum 4 images allowed');
      return;
    }

    setIsSubmitting(true);
    try {
      const processedFiles = await Promise.all(
        selectedFiles.map(async (file) => {
          if (!file.type.startsWith('image/')) {
            throw new Error('Only images are supported');
          }
          return sanitizeImage(file);
        })
      );

      setMediaFiles(prev => [
        ...prev,
        ...processedFiles.map(file => ({
          ...file,
          type: 'image' as const
        }))
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process images');
    } finally {
      setIsSubmitting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agent) {
      toast.error('Not authenticated');
      return;
    }

    if (!text.trim()) {
      toast.error('Post text cannot be empty');
      return;
    }

    try {
      setIsSubmitting(true);

      if (isScheduling && scheduledDate && scheduledTime) {
        const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`);
        
        if (scheduledFor <= new Date()) {
          toast.error('Scheduled time must be in the future');
          return;
        }
        
        await onPostScheduled({
          text,
          scheduledFor: scheduledFor.toISOString(),
          media: mediaFiles.length > 0 ? mediaFiles : undefined
        });
        
        setText('');
        setIsScheduling(false);
        setScheduledDate('');
        setScheduledTime('');
        setMediaFiles([]);
        toast.success('Post scheduled successfully');
      } else {
        let embed;
        
        if (mediaFiles.length > 0) {
          const uploadedBlobs = await Promise.all(
            mediaFiles.map(media => {
              const base64Data = media.base64.split(',')[1];
              const byteCharacters = atob(base64Data);
              const byteArrays = new Uint8Array(byteCharacters.length);
              
              for (let i = 0; i < byteCharacters.length; i++) {
                byteArrays[i] = byteCharacters.charCodeAt(i);
              }

              return agent.api.com.atproto.repo.uploadBlob(byteArrays, {
                encoding: media.mimeType,
              });
            })
          );

          embed = {
            $type: 'app.bsky.embed.images',
            images: uploadedBlobs.map(response => ({
              alt: 'Image',
              image: response.data.blob
            }))
          };
        }

        await agent.post({
          text,
          embed,
          createdAt: new Date().toISOString()
        });

        setText('');
        setMediaFiles([]);
        toast.success('Post published successfully');
      }
    } catch (error) {
      console.error('Post error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetScheduling = () => {
    setIsScheduling(false);
    setScheduledDate('');
    setScheduledTime('');
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onEmojiClick = (emojiData: { emoji: string }) => {
    setText(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="What's on your mind?"
          rows={3}
          maxLength={300}
          required
          disabled={isSubmitting}
        />
        
        {mediaFiles.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {mediaFiles.map((file, index) => (
              <div key={index} className="relative">
                <img
                  src={file.base64}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded"
                />
                <button
                  type="button"
                  onClick={() => removeMedia(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                  disabled={isSubmitting}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
            multiple
            disabled={isSubmitting}
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            disabled={isSubmitting || mediaFiles.length >= 4}
          >
            <Image className="w-5 h-5" />
            Add Image {mediaFiles.length > 0 && `(${mediaFiles.length}/4)`}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
              disabled={isSubmitting}
            >
              <Smile className="w-5 h-5" />
              Add Emoji
            </button>
            
            {showEmojiPicker && (
              <div className="absolute bottom-10 right-0 z-50">
                <EmojiPicker onEmojiClick={onEmojiClick} />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsScheduling(!isScheduling)}
            className={`flex items-center gap-2 ${
              isScheduling 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
            }`}
            disabled={isSubmitting}
          >
            <Calendar className="w-5 h-5" />
            Schedule Post
          </button>
        </div>

        {isScheduling && (
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
            <div className="flex-1 flex items-center gap-4">
              <div className="flex-1">
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  id="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full border rounded-md p-2 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  required={isScheduling}
                  disabled={isSubmitting}
                />
              </div>
              <div className="flex-1">
                <label htmlFor="time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  id="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full border rounded-md p-2 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  required={isScheduling}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={resetScheduling}
              className="self-end p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          <Send className="w-4 h-4" />
          {isSubmitting ? 'Processing...' : isScheduling ? 'Schedule' : 'Post Now'}
        </button>
      </div>
    </form>
  );
};