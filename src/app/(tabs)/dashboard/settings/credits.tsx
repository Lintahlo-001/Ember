import Screen from '@/src/components/layout/Screen';
import ScreenHeader from '@/src/components/molecules/ScreenHeader';
import { theme } from '@/src/theme/theme';
import { ScrollView, Text } from 'react-native';

const body = { fontFamily: 'WorkSans-Regular', fontSize: 15, lineHeight: 22, color: theme.colors.text } as const;
const head = { fontFamily: 'WorkSans-Medium', fontSize: 16, color: theme.colors.text, marginTop: 8 } as const;

export default function CreditsScreen() {
  return (
    <Screen>
      <ScreenHeader title="Credits" />
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 32, gap: 8 }}>
        <Text style={head}>Card data</Text>
        <Text style={body}>Card, set and pricing data from TCGdex. Fallback card images from Pokéwallet.</Text>
        <Text style={head}>Pokémon data</Text>
        <Text style={body}>Pokémon data and artwork from PokeAPI.</Text>
        <Text style={head}>Exchange rates</Text>
        <Text style={body}>Currency rates from Frankfurter (European Central Bank data).</Text>
        <Text style={head}>Trademarks</Text>
        <Text style={body}>Pokémon and Pokémon character names are trademarks of Nintendo, Creatures Inc. and GAME FREAK inc. Ember is an unofficial fan project and is not affiliated with them.</Text>
      </ScrollView>
    </Screen>
  );
}