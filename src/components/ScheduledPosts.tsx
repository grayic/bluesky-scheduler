import React from 'react';
import { Post } from '../types/bluesky';
import { Edit2, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { format, isSameDay, isToday, isTomorrow } from 'date-fns';

interface ScheduledPostsProps {
  posts: Post[];
  onEdit: (post: Post) => void;
  onDelete: (id: string) => void;
}

interface GroupedPosts {
  [key: string]: Post[];
}

export const ScheduledPosts: React.FC<ScheduledPostsProps> = ({ posts, onEdit, onDelete }) => {
  // Filter out published posts
  const unpublishedPosts = posts.filter(post => post.status !== 'published');

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'h:mm a');
    } catch (error) {
      console.error('Error parsing time:', error);
      return 'Invalid time';
    }
  };

  const formatGroupDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isToday(date)) {
        return 'Today';
      }
      if (isTomorrow(date)) {
        return 'Tomorrow';
      }
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      console.error('Error parsing date:', error);
      return 'Invalid date';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Calendar className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'failed':
        return 'Failed';
      default:
        return 'Scheduled';
    }
  };

  if (unpublishedPosts.length === 0) {
    return (
      <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg">
        <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          No scheduled posts yet
        </p>
      </div>
    );
  }

  // Group posts by date
  const groupedPosts = unpublishedPosts.reduce((groups: GroupedPosts, post) => {
    const date = new Date(post.scheduledFor);
    const dateKey = format(date, 'yyyy-MM-dd');
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    
    groups[dateKey].push(post);
    return groups;
  }, {});

  // Sort dates (newest first) and sort posts within each date
  const sortedDates = Object.keys(groupedPosts).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  sortedDates.forEach(date => {
    groupedPosts[date].sort((a, b) => 
      new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime()
    );
  });

  return (
    <div className="space-y-8">
      {sortedDates.map(dateKey => (
        <div key={dateKey} className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 sticky top-0 bg-gray-100 dark:bg-gray-900 py-2">
            {formatGroupDate(dateKey)}
          </h3>
          <div className="space-y-4">
            {groupedPosts[dateKey].map((post) => (
              <div
                key={post.id}
                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(post.status)}
                      <span className="text-sm font-medium">
                        {getStatusText(post.status)}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatTime(post.scheduledFor)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {post.status === 'scheduled' && (
                      <button
                        onClick={() => onEdit(post)}
                        className="p-1 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                        title="Edit post"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(post.id)}
                      className="p-1 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                      title="Delete post"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {post.text}
                </p>
                
                {post.media && post.media.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {post.media.map((media, index) => (
                      <div key={index} className="relative">
                        <img
                          src={media.base64}
                          alt="Media preview"
                          className="w-20 h-20 object-cover rounded"
                        />
                      </div>
                    ))}
                  </div>
                )}
                
                {post.error && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    Error: {post.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};