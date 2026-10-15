import React from 'react';
import type { Book } from '../types';

interface BookCardProps {
  book: Book;
  onClick: () => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onClick }) => {
  return (
    <div className="book-card" onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <div className="book-card-cover">
        {book.coverUrl ? (
          <img src={book.coverUrl} alt={book.title} className="book-card-img" loading="lazy" />
        ) : (
          <div className="typographic-cover">
            <span className="typographic-cover-format">{book.format}</span>
            <h3 className="typographic-cover-title">{book.title}</h3>
            <p className="typographic-cover-author">{book.author}</p>
          </div>
        )}
        {book.progress > 0 && (
          <div className="book-card-progress-badge">
            {book.progress === 100 ? 'Finished' : `${book.progress}%`}
          </div>
        )}
      </div>
      <div className="book-card-meta">
        <h4 className="book-card-title" title={book.title}>{book.title}</h4>
        <p className="book-card-author">{book.author}</p>
      </div>
    </div>
  );
};
