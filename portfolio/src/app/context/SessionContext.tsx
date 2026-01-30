'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Project } from '../projects/projectData';

export interface ProjectsState {
    swipedCards: Project[];
    dismissedCards: Project[];
    dismissedViewSwipedCards: Set<string>;
    showAllCards: boolean;
    showDismissedOnly: boolean;
    hasShownTutorial: boolean;
    hasDismissedTutorial: boolean;
    // We can add selectedProject here if we want that persisted too, 
    // but usually modal state is ephemeral to the page view.
}

interface SessionContextType {
    // Resume State
    resumeBase64: string | null;
    resumeLoading: boolean;

    // Projects State
    projectsState: ProjectsState;
    setProjectsState: React.Dispatch<React.SetStateAction<ProjectsState>>;
    updateProjectsState: (updates: Partial<ProjectsState>) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const INITIAL_PROJECTS_STATE: ProjectsState = {
    swipedCards: [],
    dismissedCards: [],
    dismissedViewSwipedCards: new Set(),
    showAllCards: true,
    showDismissedOnly: false,
    hasShownTutorial: false,
    hasDismissedTutorial: false,
};

export function SessionProvider({ children }: { children: React.ReactNode }) {
    // Resume State
    const [resumeBase64, setResumeBase64] = useState<string | null>(null);
    const [resumeLoading, setResumeLoading] = useState(true);

    // Projects State
    const [projectsState, setProjectsState] = useState<ProjectsState>(INITIAL_PROJECTS_STATE);

    // Fetch Resume on Mount (Session Start)
    useEffect(() => {
        const fetchResume = async () => {
            try {
                setResumeLoading(true);
                // Force a fresh fetch by appending a timestamp
                const response = await fetch(`/resume_alex_spaulding.pdf?v=${Date.now()}`);
                const blob = await response.blob();

                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64data = reader.result as string;
                    setResumeBase64(base64data);
                    setResumeLoading(false);
                    console.log('Session: Resume fetched and cached for this session');
                };
                reader.onerror = () => {
                    console.error('Session: Failed to read resume blob');
                    setResumeLoading(false);
                };
                reader.readAsDataURL(blob);
            } catch (error) {
                console.error('Session: Failed to fetch resume:', error);
                setResumeLoading(false);
            }
        };

        fetchResume();
    }, []);

    const updateProjectsState = useCallback((updates: Partial<ProjectsState>) => {
        setProjectsState(prev => ({ ...prev, ...updates }));
    }, []);

    return (
        <SessionContext.Provider value={{
            resumeBase64,
            resumeLoading,
            projectsState,
            setProjectsState,
            updateProjectsState
        }}>
            {children}
        </SessionContext.Provider>
    );
}

export function useSession() {
    const context = useContext(SessionContext);
    if (context === undefined) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return context;
}
