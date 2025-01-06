import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Calendar } from 'react-native-big-calendar';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useIsFocused } from '@react-navigation/native';
import { doesEventOccurOnDate } from '../../utils/recurrenceUtils';

/**
 * DayViewScreen:
 *  - "big-calendar" oversigt for bestemt dag (selectedDate).
 *  - Henter ALLE events for gruppen, + filtrerer i JS med doesEventOccurOnDate.
 *  - Viser events "hourly" layout-kalender ('react-native-big-calendar').
 */
export default function DayViewScreen({ route }) {
    const { selectedDate, groupId } = route.params;
    // local state: liste over events i "Calendar"-format
    const [events, setEvents] = useState([]);
    // loading: viser en spinner mens data hentes
    const [loading, setLoading] = useState(true);
    // isFocused: genindlæse data
    const isFocused = useIsFocused();

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);

            // Hvis ingen groupId => ingen events
            if (!groupId) {
                setEvents([]);
                setLoading(false);
                return;
            }

            try {
                // 1) Hent alle event-documents for groupId
                const q = query(
                    collection(db, 'events'),
                    where('groupIds', 'array-contains', groupId)
                );
                const querySnapshot = await getDocs(q);

                const dayEvents = [];

                // 2) Filtrér med doesEventOccurOnDate
                querySnapshot.forEach((docSnap) => {
                    const eventData = docSnap.data();

                    // Tjek om eventData gælder for selectedDate
                    if (doesEventOccurOnDate(eventData, selectedDate)) {
                        // Hvis startTime og endTime er defineret, brug dem til "Calendar"
                        if (eventData.startTime && eventData.endTime) {
                            const start = new Date(eventData.startTime);
                            const end = new Date(eventData.endTime);
                            dayEvents.push({
                                title: eventData.title || 'Uden titel',
                                start: start,
                                end: end,
                                color: eventData.userColor || '#000',
                            });
                        }
                    }
                });

                setEvents(dayEvents);
            } catch (error) {
                console.log('Fejl ved hentning af events:', error);
            }
            // færdige med load
            setLoading(false);
        };

        // call fetchEvents hver gang skærmen bliver aktiv eller hvis selectedDate ændres
        if (isFocused) {
            fetchEvents();
        }
    }, [selectedDate, isFocused, groupId]);

    // Hvis stadig loader data, vis spinner
    if (loading) {
        return <ActivityIndicator style={{ flex: 1 }} />;
    }

    // eventCellStyle: Funktion til at style hver "event box" i big-calendar
    const eventCellStyle = (event) => ({
        backgroundColor: event.color || '#000',
        borderRadius: 5,
        padding: 5,
    });

    return (
        <View style={{ flex: 1 }}>
            <Calendar
                events={events}      // Listen over events i big-calendar format
                height={600}         // højde på kalenderen
                mode="day"           // Viser kun ene dag
                date={new Date(selectedDate)} // Hvilken dag der fokuseres på
                eventCellStyle={eventCellStyle}
                overlapOffset={100}  // Hvor meget events overlapper
            />
        </View>
    );
}