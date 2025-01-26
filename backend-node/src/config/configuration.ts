export default () => ({
  logger: {
    transport: {
      console: {
        isSilent: process.env.LOGGER_TRANSPORT_CONSOLE_IS_SILENT || 'true',
        level: process.env.LOGGER_TRANSPORT_CONSOLE_LEVEL || 'debug',
      },
      file: {
        isSilent: process.env.LOGGER_TRANSPORT_FILE_IS_SILENT || 'false',
        level: process.env.LOGGER_TRANSPORT_FILE_LEVEL || 'error',
      },
    },
  },
});
