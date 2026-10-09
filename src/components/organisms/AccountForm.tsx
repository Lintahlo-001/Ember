import Button from '@/src/components/atoms/Button';
import Screen from '@/src/components/layout/Screen';
import { ActionDialog } from '@/src/components/molecules/ActionDialog';
import FormField from '@/src/components/molecules/FormField';
import ScreenHeader from '@/src/components/molecules/ScreenHeader';
import { AccountError } from '@/src/lib/account';
import { theme } from '@/src/theme/theme';
import { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
    type TextInputProps,
} from 'react-native';

export type FormFieldDef = {
  name: string;
  label: string;
  secure?: boolean;
  placeholder?: string;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoComplete?: TextInputProps['autoComplete'];
};

type Values = Record<string, string>;

type Props = {
  title: string;
  intro?: string;
  fields: FormFieldDef[];
  submitLabel: string;
  successTitle: string;
  successMessage: string;
  onSubmit: (v: Values) => Promise<string | void>;
  validate?: (v: Values) => Record<string, string>;
  onDone: () => void;
  header?: boolean;
};

export function AccountForm({
  title,
  intro,
  fields,
  submitLabel,
  successTitle,
  successMessage,
  onSubmit,
  validate,
  onDone,
}: Props) {
  const [values, setValues] = useState<Values>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  async function submit() {
    if (busy) return;

    const errs = validate?.(values) ?? {};
    setErrors(errs);
    setFormError(null);

    if (Object.keys(errs).length > 0) return;

    setBusy(true);

    try {
      const msg = await onSubmit(values);
      setDoneMsg(typeof msg === 'string' ? msg : successMessage);
    } catch (e) {
      const err =
        e instanceof AccountError
          ? e
          : new AccountError(
              e instanceof Error ? e.message : 'Something went wrong.',
            );

      if (err.field && fields.some((f) => f.name === err.field)) {
        setErrors({ [err.field]: err.message });
      } else {
        setFormError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader title={title} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingTop: 16,
            paddingBottom: 32,
            gap: 16,
          }}
        >
          {!!intro && <Text style={s.intro}>{intro}</Text>}

          {fields.map((f) => (
            <FormField
              key={f.name}
              label={f.label}
              value={values[f.name] ?? ''}
              onChangeText={(t: string) =>
                setValues((p) => ({ ...p, [f.name]: t }))
              }
              error={errors[f.name]}
              secureTextEntry={f.secure}
              placeholder={f.placeholder}
              keyboardType={f.keyboardType}
              autoCapitalize={
                f.autoCapitalize ?? (f.secure ? 'none' : undefined)
              }
              autoComplete={f.autoComplete}
              autoCorrect={false}
            />
          ))}

          {!!formError && (
            <Text accessibilityLiveRegion="polite" style={s.error}>
              {formError}
            </Text>
          )}

          <View style={{ marginTop: 8 }}>
            <Button
              label={submitLabel}
              onPress={submit}
              loading={busy}
              disabled={busy}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ActionDialog
        visible={doneMsg !== null}
        icon="check-circle"
        title={successTitle}
        message={doneMsg ?? ''}
        confirmLabel="OK"
        onConfirm={() => {
          setDoneMsg(null);
          onDone();
        }}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  intro: {
    fontFamily: 'WorkSans-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.text,
  },
  error: {
    fontFamily: 'WorkSans-Medium',
    fontSize: 14,
    color: theme.colors.accent,
  },
});