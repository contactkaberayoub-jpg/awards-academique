package com.awardsacademique.common.config;

import org.springframework.boot.jackson.JacksonComponent;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.core.convert.converter.ConverterFactory;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import tools.jackson.core.JacksonException;
import tools.jackson.core.JsonParser;
import tools.jackson.databind.BeanProperty;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.JavaType;
import tools.jackson.databind.ValueDeserializer;

import java.util.Arrays;

@Configuration
public class EnumConfig implements WebMvcConfigurer {

    @Override
    @SuppressWarnings({"rawtypes", "unchecked"})
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverterFactory(new ConverterFactory<String, Enum>() {
            @Override
            public <T extends Enum> Converter<String, T> getConverter(Class<T> targetType) {
                return new Converter<String, T>() {
                    @Override
                    public T convert(String source) {
                        if (source == null || source.isBlank()) {
                            return null;
                        }
                        String candidate = source.trim();
                        for (T constant : targetType.getEnumConstants()) {
                            if (constant.name().equalsIgnoreCase(candidate)) {
                                return constant;
                            }
                        }
                        throw new IllegalArgumentException(
                                "No enum constant " + targetType.getName() + "." + source
                                        + " (accepted: " + Arrays.toString(targetType.getEnumConstants()) + ")");
                    }
                };
            }
        });
    }

    @JacksonComponent(type = Enum.class)
    public static final class CaseInsensitiveEnumValueDeserializer extends ValueDeserializer<Enum<?>> {

        private final Class<? extends Enum<?>> enumType;

        public CaseInsensitiveEnumValueDeserializer() {
            this.enumType = null;
        }

        private CaseInsensitiveEnumValueDeserializer(Class<? extends Enum<?>> enumType) {
            this.enumType = enumType;
        }

        @Override
        public ValueDeserializer<?> createContextual(DeserializationContext ctxt, BeanProperty property) {
            JavaType contextualType = ctxt.getContextualType();
            if (contextualType != null && contextualType.getRawClass().isEnum()) {
                return new CaseInsensitiveEnumValueDeserializer(
                        (Class<? extends Enum<?>>) contextualType.getRawClass());
            }
            return this;
        }

        @Override
        public Enum<?> deserialize(JsonParser p, DeserializationContext ctxt) throws JacksonException {
            String text = p.getValueAsString();
            if (text == null) {
                return null;
            }
            if (enumType == null) {
                throw ctxt.weirdStringException(text, Enum.class, "cannot resolve enum type");
            }
            String candidate = text.trim();
            for (Enum<?> constant : enumType.getEnumConstants()) {
                if (constant.name().equalsIgnoreCase(candidate)) {
                    return constant;
                }
            }
            throw ctxt.weirdStringException(
                    text, enumType,
                    "not one of the accepted values: " + Arrays.toString(enumType.getEnumConstants()));
        }
    }
}
