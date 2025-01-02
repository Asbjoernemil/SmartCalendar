import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Calendar } from 'react-native-big-calendar'; // Importer Calendar korrekt
import { db } from '../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useIsFocused } from '@react-navigation/native';

export default function DayViewScreen({ route }) {
    const { selectedDate, groupId } = route.params;
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const isFocused = useIsFocused();

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            if (!groupId) {
                setEvents([]);
                setLoading(false);
                return;
            }

            const q = query(
                collection(db, 'events'),
                where('date', '==', selectedDate),
                where('groupId', '==', groupId)
            );

            const querySnapshot = await getDocs(q);
            const eventsData = [];
            querySnapshot.forEach(docSnap => {
                const eventData = docSnap.data();
                if (eventData.startTime && eventData.endTime) {
                    eventsData.push({
                        title: eventData.title || 'Uden titel',
                        start: new Date(eventData.startTime),
                        end: new Date(eventData.endTime),
                        color: eventData.userColor || '#000',
                    });
                }
            });

            setEvents(eventsData);
            setLoading(false);
        };

        if (isFocused) {
            fetchEvents();
        }
    }, [selectedDate, isFocused, groupId]);

    if (loading) {
        return <ActivityIndicator style={{ flex: 1 }} />;
    }

    const eventCellStyle = (event) => {
        return {
            backgroundColor: event.color || '#000',
            borderRadius: 5,
            padding: 5,
        };
    };

    return (
        <View style={{ flex: 1 }}>
            <Calendar
                events={events}
                height={600}
                mode="day"
                date={new Date(selectedDate)}
                eventCellStyle={eventCellStyle}
                overlapOffset={100}
            />
        </View>
    );
}
