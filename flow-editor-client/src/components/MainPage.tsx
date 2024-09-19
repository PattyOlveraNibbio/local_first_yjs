import React from 'react';
import { Link } from 'react-router-dom';

const MainPage: React.FC = () => {
  return (
    <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-min-h-screen tw-bg-gray-100">
      <h1 className="tw-text-4xl tw-font-bold tw-mb-8">Welcome to Flow Editor App</h1>
      <div className="tw-space-y-4">
        <Link
          to="/editor"
          className="tw-block tw-px-6 tw-py-3 tw-bg-blue-500 tw-text-white tw-rounded-lg hover:tw-bg-blue-600 tw-transition tw-duration-300 tw-text-center tw-w-48"
        >
          Open Flow Editor
        </Link>
        <Link
          to="/websocket-test"
          className="tw-block tw-px-6 tw-py-3 tw-bg-green-500 tw-text-white tw-rounded-lg hover:tw-bg-green-600 tw-transition tw-duration-300 tw-text-center tw-w-48"
        >
          Open WebSocket Tester
        </Link>
      </div>
    </div>
  );
};

export default MainPage;