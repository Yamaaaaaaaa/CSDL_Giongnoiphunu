import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Layout from './layouts/Layout.jsx';
import SearchPage from './pages/SearchPage.jsx';
import DatabasePage from './pages/DatabasePage.jsx';
import ComparePage from './pages/ComparePage.jsx';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <SearchPage /> },
      { path: 'database', element: <DatabasePage /> },
      { path: 'compare', element: <ComparePage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
