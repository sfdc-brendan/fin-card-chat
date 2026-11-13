import type { RouteObject } from 'react-router';
import AppLayout from '@/appLayout';
import CardEditor from './pages/CardEditor';
import CardLibrary from './pages/CardLibrary';
import DisplaySettings from './pages/DisplaySettings';
import MatchTester from './pages/MatchTester';
import NotFound from './pages/NotFound';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <CardLibrary />,
        handle: { showInNavigation: true, label: 'Library' },
      },
      {
        path: 'cards/new',
        element: <CardEditor />,
        handle: { showInNavigation: true, label: 'New card' },
      },
      {
        path: 'cards/:cardId',
        element: <CardEditor />,
      },
      {
        path: 'match',
        element: <MatchTester />,
        handle: { showInNavigation: true, label: 'Match tester' },
      },
      {
        path: 'display',
        element: <DisplaySettings />,
        handle: { showInNavigation: true, label: 'Display' },
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
];
