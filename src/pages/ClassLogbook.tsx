
import React from 'react';
import { useParams } from 'react-router-dom';
import DashboardView from '../components/ClassLogbook/DashboardView';
import ListView from '../components/ClassLogbook/ListView';
import DetailView from '../components/ClassLogbook/DetailView';

/**
 * Class Logbook Page
 * 
 * This page acts as a router/controller for the Class Logbook feature.
 * It determines which view to show based on the URL parameters:
 * - /class-logbook -> DashboardView (List of all classes)
 * - /class-logbook/class/:classId -> ListView (List of sessions for a class)
 * - /class-logbook/session/:sessionId -> DetailView (Details of a specific session)
 */
const ClassLogbook: React.FC = () => {
    const { classId, sessionId } = useParams<{ classId?: string; sessionId?: string; }>();

    if (sessionId) {
        return <DetailView sessionId={sessionId} />;
    }

    if (classId) {
        return <ListView classId={classId} />;
    }

    return <DashboardView />;
};

export default ClassLogbook;