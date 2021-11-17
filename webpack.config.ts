import { Configuration, IgnorePlugin } from 'webpack'
import {
  CustomWebpackBrowserSchema,
  TargetOptions
} from '@angular-builders/custom-webpack'
import nodeExternals from 'webpack-node-externals'

export default (
  config: Configuration,
  _options: CustomWebpackBrowserSchema,
  targetOptions: TargetOptions
) => {
  if (targetOptions.target === 'server') {
    config.resolve?.extensions?.push('.mjs', '.graphql', '.gql')

    config.module?.rules?.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto'
    });

    config.externalsPresets = { node: true };

    (config.externals as Array<any>).push(
      nodeExternals({ allowlist: [/^(?!(livereload|concurrently|fsevents)).*/]})
    );

    config.plugins?.push(
      new IgnorePlugin({
        checkResource: (resource: string) => {
          const lazyImports = [
            "@nestjs/microservices",
            "@nestjs/microservices/microservices-module",
            "@nestjs/websockets",
            "@nestjs/websockets/socket-module",
            "cache-manager"
          ];

          if (!lazyImports.includes(resource)) {
            return false;
          }

          try {
            require.resolve(resource)
          } catch (_err: any) {
            return true;
          }
          return false;
        }
      })
    );
  }
  return config;
};