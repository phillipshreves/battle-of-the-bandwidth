'use client';

import { useState, useEffect } from 'react';
import { UserSettings } from '@/types/types';
import SchedulesTable from './SchedulesTable';

export default function Settings() {
    const [settings, setSettings] = useState<UserSettings | null>(null);
    const [frequency, setFrequency] = useState<number>(60);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/settings');
            if (!response.ok) throw new Error('Failed to fetch settings');
            const responseJson = await response.json();
            const data = responseJson.data;
            setSettings(data);
            setFrequency(data.speedtest_frequency);
        } catch (err) {
            setError(`Failed to load settings: ${err}`);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('/api/settings', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ speedtest_frequency: frequency }),
            });

            if (!response.ok) throw new Error('Failed to update settings');

            setSuccess('Settings updated successfully');
            setIsEditing(false);
            fetchSettings();
        } catch (err) {
            setError(`Failed to load settings: ${err}`);
        }
    };

    const runSpeedTestNow = async () => {
        try {
            const response = await fetch('/api/speedtest', {
                method: 'POST',
            });
            if (!response.ok) throw new Error('Failed to run speed test');
            setSuccess('Speed test started successfully');
            setTimeout(() => setSuccess(null), 5000);
        } catch (err) {
            setError(`Failed to run speed test: ${err}`);
        }
    };

    return (
        <div className="p-6 bg-slate-800 rounded-lg shadow-lg max-w-4xl mx-auto mt-8">
            <h2 className="text-2xl font-bold mb-6">Settings</h2>
            
            {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4">
                    {error}
                </div>
            )}
            
            {success && (
                <div className="bg-green-500/10 border border-green-500 text-green-500 p-3 rounded mb-4">
                    {success}
                </div>
            )}

            <button
                onClick={runSpeedTestNow}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/80 mb-4"
            >
                Run Speed Test Now
            </button>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Speed Test Frequency (minutes)
                    </label>
                    {isEditing ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input
                                type="number"
                                min="1"
                                value={frequency}
                                onChange={(e) => setFrequency(parseInt(e.target.value))}
                                className="w-full p-2 bg-slate-700 rounded border border-slate-600 focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                            <div className="flex space-x-4">
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/80"
                                >
                                    Save
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setFrequency(settings?.speedtest_frequency || 60);
                                    }}
                                    className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="flex items-center space-x-4">
                            <span className="text-lg">{frequency} minutes</span>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600"
                            >
                                Edit
                            </button>
                        </div>
                    )}
                </div>

                <div className="text-sm text-slate-400">
                    <p>Last updated: {settings?.updated_at ? new Date(settings.updated_at).toLocaleString() : 'Never'}</p>
                </div>
            </div>

            <SchedulesTable />
        </div>
    );
} 
